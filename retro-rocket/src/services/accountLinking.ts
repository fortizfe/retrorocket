import {
    fetchSignInMethodsForEmail,
    linkWithCredential,
    linkWithPopup,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    User as FirebaseUser,
    AuthCredential,
    AuthError
} from 'firebase/auth';
import { auth } from './firebase';
import { AuthProviderType } from '../types/user';
import { userService } from './userService';

export interface AccountLinkingResult {
    success: boolean;
    user: FirebaseUser | null;
    message: string;
    wasLinked: boolean;
}

export interface ProviderCredentialError extends AuthError {
    email: string;
    credential: AuthCredential;
}

export class AccountLinkingService {
    private static instance: AccountLinkingService;

    public static getInstance(): AccountLinkingService {
        if (!AccountLinkingService.instance) {
            AccountLinkingService.instance = new AccountLinkingService();
        }
        return AccountLinkingService.instance;
    }

    /**
     * Attempts to sign in with a provider and handles account linking automatically
     */
    async signInWithAccountLinking(providerType: AuthProviderType): Promise<AccountLinkingResult> {
        if (!auth) {
            throw new Error('Firebase Auth is not initialized');
        }

        const provider = this.getProvider(providerType);
        if (!provider) {
            throw new Error(`Provider ${providerType} is not supported`);
        }

        try {
            // Check if user is already authenticated
            const currentUser = auth.currentUser;

            if (currentUser) {
                // User is already logged in, try to link directly
                return await this.linkProviderToCurrentUser(provider, providerType);
            } else {
                // User is not logged in, try normal sign in
                const result = await signInWithPopup(auth, provider);
                return {
                    success: true,
                    user: result.user,
                    message: 'Inicio de sesión exitoso',
                    wasLinked: false
                };
            }

        } catch (error: any) {
            console.log('Sign in error:', error);

            // Handle account exists with different credential
            if (error.code === 'auth/account-exists-with-different-credential') {
                return await this.handleAccountExistsError(error as ProviderCredentialError, providerType);
            }

            // Handle other errors
            throw this.handleAuthError(error, providerType);
        }
    }

    /**
     * Links a provider to the currently authenticated user
     */
    private async linkProviderToCurrentUser(provider: GoogleAuthProvider | GithubAuthProvider, providerType: AuthProviderType): Promise<AccountLinkingResult> {
        if (!auth?.currentUser) {
            throw new Error('No user is currently authenticated');
        }

        const currentUserEmail = auth.currentUser.email;
        if (!currentUserEmail) {
            throw new Error('El usuario actual no tiene email asociado');
        }

        try {
            // Use linkWithPopup directly for authenticated users
            const result = await linkWithPopup(auth.currentUser, provider);

            // Update the providers list in Firestore
            try {
                // Get the current user's providers before adding the new one
                const currentUserProfile = await userService.getUserProfile(auth.currentUser.uid);

                if (currentUserProfile) {
                    // Check if the provider is already in the list
                    if (!currentUserProfile.providers.includes(providerType)) {
                        console.log(`Adding provider ${providerType} to current user ${auth.currentUser.uid}`);
                        await userService.addProviderToUser(auth.currentUser.uid, providerType);
                    } else {
                        console.log(`Provider ${providerType} already exists for current user ${auth.currentUser.uid}`);
                    }
                } else {
                    // If no profile exists, something is wrong, but try to add anyway
                    console.warn('Current user profile not found, attempting to add provider anyway');
                    await userService.addProviderToUser(auth.currentUser.uid, providerType);
                }
            } catch (firestoreError) {
                console.warn('Failed to update providers in Firestore:', firestoreError);
                // Don't fail the whole operation if Firestore update fails
            }

            return {
                success: true,
                user: result.user,
                message: `Proveedor ${this.getProviderName(providerType)} vinculado exitosamente.`,
                wasLinked: true
            };

        } catch (error: any) {
            console.error('Error during provider linking:', error);

            if (error.code === 'auth/account-exists-with-different-credential') {
                return await this.handleAccountExistsError(error, providerType);
            }

            return await this.handleProviderLinkingError(error, currentUserEmail, providerType);
        }
    }

    /**
     * Handles errors during provider linking
     */
    private async handleProviderLinkingError(error: any, currentUserEmail: string, providerType: AuthProviderType): Promise<AccountLinkingResult> {
        if (error.code === 'auth/account-exists-with-different-credential') {
            // Create error object compatible with new method
            const enhancedError = {
                ...error,
                email: error.email ?? currentUserEmail
            };
            return await this.handleAccountExistsError(enhancedError, providerType);
        }

        if (error.code === 'auth/credential-already-in-use') {
            throw new Error('Esta cuenta ya está vinculada a otro usuario');
        }

        if (error.code === 'auth/provider-already-linked') {
            throw new Error('Este proveedor ya está vinculado a tu cuenta');
        }

        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('La vinculación fue cancelada');
        }

        if (error.code === 'auth/popup-blocked') {
            throw new Error('El popup fue bloqueado. Por favor, permite popups para este sitio.');
        }

        throw new Error(`Error al vincular ${this.getProviderName(providerType)}: ${error.message ?? 'Error desconocido'}`);
    }

    /**
     * Gets user-friendly provider name
     */
    private getProviderName(providerType: AuthProviderType): string {
        switch (providerType) {
            case 'google':
                return 'Google';
            case 'github':
                return 'GitHub';
            case 'apple':
                return 'Apple';
            default:
                return providerType;
        }
    }

    /**
     * Handles the account linking flow when an email exists with different credential
     */
    private async handleAccountLinking(error: ProviderCredentialError): Promise<AccountLinkingResult> {
        if (!auth) {
            throw new Error('Firebase Auth is not initialized');
        }

        try {
            const email = this.getEmailForLinking(error);
            const pendingCredential = error.credential;

            if (!pendingCredential) {
                throw new Error('No se pudo obtener la credencial pendiente');
            }

            // If we can't get email, try alternative approach with current user
            if (!email) {
                console.log('Email not available, attempting direct linking to current user');
                return await this.handleAccountLinkingWithoutEmail(pendingCredential);
            }

            console.log('Account linking flow initiated for email:', email);
            return await this.performAccountLinking(email, pendingCredential);

        } catch (linkError: any) {
            console.error('Account linking failed:', linkError);
            throw this.handleLinkingError(linkError);
        }
    }

    /**
     * Performs the actual account linking process
     */
    private async performAccountLinking(email: string, pendingCredential: AuthCredential): Promise<AccountLinkingResult> {
        // Get existing sign-in methods for this email
        const signInMethods = await fetchSignInMethodsForEmail(auth!, email);

        if (signInMethods.length === 0) {
            throw new Error('No se encontraron métodos de inicio de sesión para este email');
        }

        console.log('Existing sign-in methods:', signInMethods);

        // Determine which provider to use for the existing account
        const existingProviderType = this.getProviderTypeFromMethod(signInMethods[0]);
        const existingProvider = this.getProvider(existingProviderType);

        if (!existingProvider) {
            throw new Error(`Proveedor ${existingProviderType} no soportado`);
        }

        // Sign in with the existing provider
        console.log('Signing in with existing provider:', existingProviderType);
        const existingUserResult = await signInWithPopup(auth!, existingProvider);

        // Link the new credential to the existing account
        console.log('Linking new credential to existing account');
        const linkedUser = await linkWithCredential(existingUserResult.user, pendingCredential);

        // Update the providers list in Firestore
        try {
            // Get provider type from the credential
            const newProviderType = this.getProviderTypeFromCredential(pendingCredential);

            // Get the current user's providers before adding the new one
            const currentUserProfile = await userService.getUserProfile(linkedUser.user.uid);

            if (currentUserProfile) {
                // Check if the new provider is already in the list
                if (!currentUserProfile.providers.includes(newProviderType)) {
                    console.log(`Adding provider ${newProviderType} to user ${linkedUser.user.uid}`);
                    await userService.addProviderToUser(linkedUser.user.uid, newProviderType);
                } else {
                    console.log(`Provider ${newProviderType} already exists for user ${linkedUser.user.uid}`);
                }

                // Also ensure the existing provider is in the list (in case the profile was created before the migration)
                if (!currentUserProfile.providers.includes(existingProviderType)) {
                    console.log(`Adding existing provider ${existingProviderType} to user ${linkedUser.user.uid} (migration fix)`);
                    await userService.addProviderToUser(linkedUser.user.uid, existingProviderType);
                }
            } else {
                // If no profile exists, something is wrong, but try to add anyway
                console.warn('User profile not found, attempting to add provider anyway');
                await userService.addProviderToUser(linkedUser.user.uid, newProviderType);
            }
        } catch (firestoreError) {
            console.warn('Failed to update providers in Firestore:', firestoreError);
            // Don't fail the whole operation if Firestore update fails
        }

        return {
            success: true,
            user: linkedUser.user,
            message: `Tu cuenta ha sido vinculada exitosamente. Ahora puedes iniciar sesión con ambos métodos.`,
            wasLinked: true
        };
    }

    /**
     * Handles linking errors with user-friendly messages
     */
    private handleLinkingError(linkError: any): Error {
        if (linkError.code === 'auth/popup-closed-by-user') {
            return new Error('La vinculación fue cancelada');
        }

        if (linkError.code === 'auth/popup-blocked') {
            return new Error('El popup fue bloqueado. Por favor, permite popups para este sitio.');
        }

        if (linkError.code === 'auth/credential-already-in-use') {
            return new Error('Esta credencial ya está en uso por otra cuenta');
        }

        if (linkError.code === 'auth/missing-identifier') {
            return new Error('Error de identificación. Por favor, intenta cerrar sesión y volver a iniciar sesión.');
        }

        return new Error('Error al vincular las cuentas: ' + (linkError.message ?? 'Error desconocido'));
    }

    /**
     * Gets the appropriate Firebase provider for the given provider type
     */
    private getProvider(providerType: AuthProviderType): GoogleAuthProvider | GithubAuthProvider | null {
        switch (providerType) {
            case 'google': {
                const googleProvider = new GoogleAuthProvider();
                googleProvider.addScope('profile');
                googleProvider.addScope('email');
                return googleProvider;
            }

            case 'github': {
                const githubProvider = new GithubAuthProvider();
                githubProvider.addScope('user:email');
                return githubProvider;
            }

            default:
                return null;
        }
    }

    /**
     * Maps Firebase sign-in method to our provider type
     */
    private getProviderTypeFromMethod(signInMethod: string): AuthProviderType {
        switch (signInMethod) {
            case 'google.com':
                return 'google';
            case 'github.com':
                return 'github';
            case 'apple.com':
                return 'apple';
            default:
                throw new Error(`Método de inicio de sesión no soportado: ${signInMethod}`);
        }
    }

    /**
     * Maps Firebase credential to our provider type
     */
    private getProviderTypeFromCredential(credential: AuthCredential): AuthProviderType {
        switch (credential.providerId) {
            case 'google.com':
                return 'google';
            case 'github.com':
                return 'github';
            case 'apple.com':
                return 'apple';
            default:
                throw new Error(`Proveedor no soportado: ${credential.providerId}`);
        }
    }

    /**
     * Maps auth errors to user-friendly messages
     */
    private handleAuthError(error: any, providerType: AuthProviderType): Error {
        let providerName: string;
        if (providerType === 'google') {
            providerName = 'Google';
        } else if (providerType === 'github') {
            providerName = 'GitHub';
        } else {
            providerName = providerType;
        }

        switch (error.code) {
            case 'auth/popup-closed-by-user':
                return new Error('El inicio de sesión fue cancelado');

            case 'auth/popup-blocked':
                return new Error('El popup fue bloqueado por el navegador. Por favor, permite popups para este sitio.');

            case 'auth/cancelled-popup-request':
                return new Error('La solicitud de popup fue cancelada');

            case 'auth/network-request-failed':
                return new Error('Error de conexión. Por favor, verifica tu conexión a internet.');

            case 'auth/too-many-requests':
                return new Error('Demasiados intentos de inicio de sesión. Por favor, espera un momento.');

            default:
                return new Error(`Error al iniciar sesión con ${providerName}: ${error.message ?? 'Error desconocido'}`);
        }
    }

    /**
     * Checks if an email has multiple providers linked
     */
    async getLinkedProviders(email: string): Promise<string[]> {
        if (!auth) {
            throw new Error('Firebase Auth is not initialized');
        }

        try {
            return await fetchSignInMethodsForEmail(auth, email);
        } catch (error) {
            console.error('Error fetching sign-in methods:', error);
            return [];
        }
    }

    /**
     * Attempts to extract email from credential for different providers
     */
    private async getEmailFromCredential(credential: AuthCredential, providerType: AuthProviderType): Promise<string | null> {
        // For most OAuth providers, the email is not directly accessible from the credential
        // This is a limitation of Firebase Auth for security reasons
        // We return null and rely on other methods to get the email
        console.log(`Cannot extract email from ${providerType} credential directly`);
        return null;
    }

    /**
     * Gets email for account linking from multiple sources
     */
    private getEmailForLinking(error: ProviderCredentialError): string | null {
        // Try error.email first
        if (error.email) {
            console.log('Using email from error object:', error.email);
            return error.email;
        }

        // Try current user email if authenticated
        if (auth?.currentUser?.email) {
            console.log('Using email from current authenticated user:', auth.currentUser.email);
            return auth.currentUser.email;
        }

        console.warn('No email found in error object or current user');
        return null;
    }

    /**
     * Alternative method to handle account linking when email is not available in error
     */
    private async handleAccountLinkingWithoutEmail(credential: AuthCredential): Promise<AccountLinkingResult> {
        if (!auth?.currentUser) {
            throw new Error('Para vincular cuentas automáticamente, necesitas estar autenticado. Por favor, inicia sesión con tu cuenta principal primero.');
        }

        const currentUser = auth.currentUser;
        console.log('Attempting to link credential to current user:', currentUser.uid);

        try {
            // Try to link directly to current user
            const result = await linkWithCredential(currentUser, credential);

            // Update the providers list in Firestore
            try {
                const newProviderType = this.getProviderTypeFromCredential(credential);
                await userService.addProviderToUser(currentUser.uid, newProviderType);
            } catch (firestoreError) {
                console.warn('Failed to update providers in Firestore:', firestoreError);
            }

            return {
                success: true,
                user: result.user,
                message: `Proveedor vinculado exitosamente a tu cuenta.`,
                wasLinked: true
            };

        } catch (linkError: any) {
            console.error('Direct linking failed:', linkError);
            throw this.handleLinkingError(linkError);
        }
    }

    /**
     * Handles account exists error with multiple strategies
     */
    private async handleAccountExistsError(error: ProviderCredentialError, requestedProviderType: AuthProviderType): Promise<AccountLinkingResult> {
        console.log('Handling account exists error for provider:', requestedProviderType);

        // Strategy 1: Try traditional account linking if credential is available
        if (error.credential) {
            console.log('Credential available, attempting traditional linking');
            return await this.handleAccountLinking(error);
        }

        // Strategy 2: No credential available, try alternative approach
        console.log('No credential available, using alternative linking strategy');
        return await this.handleAccountLinkingWithoutCredential(error, requestedProviderType);
    }

    /**
     * Alternative linking strategy when no credential is available
     */
    private async handleAccountLinkingWithoutCredential(error: ProviderCredentialError, requestedProviderType: AuthProviderType): Promise<AccountLinkingResult> {
        const email = this.getEmailForLinking(error);

        if (!email) {
            throw new Error('No se pudo obtener el email para vincular las cuentas. Intenta iniciar sesión con tu cuenta principal primero y luego vincular desde el perfil.');
        }

        console.log('Attempting alternative linking for email:', email);

        try {
            // Get existing sign-in methods for this email
            const signInMethods = await fetchSignInMethodsForEmail(auth!, email);

            if (signInMethods.length === 0) {
                throw new Error('No se encontraron métodos de inicio de sesión para este email');
            }

            console.log('Existing sign-in methods:', signInMethods);

            // Sign in with the existing provider first
            const existingProviderType = this.getProviderTypeFromMethod(signInMethods[0]);
            const existingProvider = this.getProvider(existingProviderType);

            if (!existingProvider) {
                throw new Error(`Proveedor ${existingProviderType} no soportado`);
            }

            console.log('Signing in with existing provider:', existingProviderType);
            const existingUserResult = await signInWithPopup(auth!, existingProvider);

            // Now try to link the requested provider to the authenticated user
            console.log('Now linking requested provider:', requestedProviderType);
            const requestedProvider = this.getProvider(requestedProviderType);

            if (!requestedProvider) {
                throw new Error(`Proveedor ${requestedProviderType} no soportado`);
            }

            const linkResult = await linkWithPopup(existingUserResult.user, requestedProvider);

            // Update the providers list in Firestore
            try {
                // Get the current user's providers before adding the new one
                const currentUserProfile = await userService.getUserProfile(linkResult.user.uid);

                if (currentUserProfile) {
                    // Check if the requested provider is already in the list
                    if (!currentUserProfile.providers.includes(requestedProviderType)) {
                        console.log(`Adding provider ${requestedProviderType} to user ${linkResult.user.uid}`);
                        await userService.addProviderToUser(linkResult.user.uid, requestedProviderType);
                    } else {
                        console.log(`Provider ${requestedProviderType} already exists for user ${linkResult.user.uid}`);
                    }

                    // Also ensure the existing provider is in the list (in case the profile was created before the migration)
                    if (!currentUserProfile.providers.includes(existingProviderType)) {
                        console.log(`Adding existing provider ${existingProviderType} to user ${linkResult.user.uid} (migration fix)`);
                        await userService.addProviderToUser(linkResult.user.uid, existingProviderType);
                    }
                } else {
                    // If no profile exists, something is wrong, but try to add anyway
                    console.warn('User profile not found, attempting to add provider anyway');
                    await userService.addProviderToUser(linkResult.user.uid, requestedProviderType);
                }
            } catch (firestoreError) {
                console.warn('Failed to update providers in Firestore:', firestoreError);
            }

            return {
                success: true,
                user: linkResult.user,
                message: `Tu cuenta ha sido vinculada exitosamente con ${this.getProviderName(requestedProviderType)}. Ahora puedes iniciar sesión con ambos métodos.`,
                wasLinked: true
            };

        } catch (linkError: any) {
            console.error('Alternative linking failed:', linkError);
            throw this.handleLinkingError(linkError);
        }
    }
}

export const accountLinkingService = AccountLinkingService.getInstance();
