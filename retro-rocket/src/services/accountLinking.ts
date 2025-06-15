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
                return await this.handleAccountLinking(error as ProviderCredentialError);
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

            return {
                success: true,
                user: result.user,
                message: `Proveedor ${this.getProviderName(providerType)} vinculado exitosamente.`,
                wasLinked: true
            };

        } catch (error: any) {
            console.error('Error during provider linking:', error);
            return await this.handleProviderLinkingError(error, currentUserEmail, providerType);
        }
    }

    /**
     * Handles errors during provider linking
     */
    private async handleProviderLinkingError(error: any, currentUserEmail: string, providerType: AuthProviderType): Promise<AccountLinkingResult> {
        if (error.code === 'auth/account-exists-with-different-credential') {
            return await this.handleAccountExistsError(error, currentUserEmail);
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
     * Handles account exists with different credential error
     */
    private async handleAccountExistsError(error: any, currentUserEmail: string): Promise<AccountLinkingResult> {
        // Check if emails are different
        if (error.email && error.email !== currentUserEmail) {
            throw new Error(`No se puede vincular esta cuenta. El email de la nueva cuenta (${error.email}) es diferente al email de tu cuenta actual (${currentUserEmail}). Solo se pueden vincular cuentas con el mismo email.`);
        }

        // Use the current user's email for linking
        const enhancedError = {
            ...error,
            email: currentUserEmail
        };

        return await this.handleAccountLinking(enhancedError);
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
            const email = error.email;
            const pendingCredential = error.credential;

            if (!email) {
                throw new Error('No se pudo obtener el email del error');
            }

            if (!pendingCredential) {
                throw new Error('No se pudo obtener la credencial pendiente');
            }

            console.log('Account linking flow initiated for email:', email);

            // Get existing sign-in methods for this email
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);

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
            const existingUserResult = await signInWithPopup(auth, existingProvider);

            // Link the new credential to the existing account
            console.log('Linking new credential to existing account');
            const linkedUser = await linkWithCredential(existingUserResult.user, pendingCredential);

            return {
                success: true,
                user: linkedUser.user,
                message: `Tu cuenta ha sido vinculada exitosamente. Ahora puedes iniciar sesión con ambos métodos.`,
                wasLinked: true
            };

        } catch (linkError: any) {
            console.error('Account linking failed:', linkError);

            // If linking fails, provide helpful error message
            if (linkError.code === 'auth/popup-closed-by-user') {
                throw new Error('La vinculación fue cancelada');
            }

            if (linkError.code === 'auth/popup-blocked') {
                throw new Error('El popup fue bloqueado. Por favor, permite popups para este sitio.');
            }

            if (linkError.code === 'auth/credential-already-in-use') {
                throw new Error('Esta credencial ya está en uso por otra cuenta');
            }

            if (linkError.code === 'auth/missing-identifier') {
                throw new Error('Error de identificación. Por favor, intenta cerrar sesión y volver a iniciar sesión.');
            }

            throw new Error('Error al vincular las cuentas: ' + (linkError.message ?? 'Error desconocido'));
        }
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
}

export const accountLinkingService = AccountLinkingService.getInstance();
