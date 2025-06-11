import React, { useState } from 'react';
import ColorPicker from './ui/ColorPicker';
import EmojiReactions from './retrospective/EmojiReactions';
import { CardColor, GroupedReaction, EmojiReaction } from '../types/card';
import { getCardStyling, getDefaultColor, getAvailableColors } from '../utils/cardColors';

const ColorSystemTest: React.FC = () => {
    const [selectedColor, setSelectedColor] = useState<CardColor>(getDefaultColor());
    const [testCardColor, setTestCardColor] = useState<CardColor>('pastelBlue');

    // Estado para testing de emojis
    const [testReactions, setTestReactions] = useState<GroupedReaction[]>([
        { emoji: '👍', count: 3, users: ['Ana', 'Luis', 'María'] },
        { emoji: '❤️', count: 1, users: ['Carlos'] }
    ]);
    const [userReaction, setUserReaction] = useState<EmojiReaction | null>(null);

    const colors = getAvailableColors();
    const cardStyling = getCardStyling(testCardColor);

    // Handlers para emojis
    const handleAddReaction = (emoji: EmojiReaction) => {
        setUserReaction(emoji);
        setTestReactions(prev => {
            const existing = prev.find(r => r.emoji === emoji);
            if (existing) {
                return prev.map(r =>
                    r.emoji === emoji
                        ? { ...r, count: r.count + 1, users: [...r.users, 'Tú'] }
                        : r
                );
            } else {
                return [...prev, { emoji, count: 1, users: ['Tú'] }];
            }
        });
    };

    const handleRemoveReaction = () => {
        if (!userReaction) return;
        setTestReactions(prev =>
            prev.map(r =>
                r.emoji === userReaction
                    ? { ...r, count: Math.max(0, r.count - 1), users: r.users.filter(u => u !== 'Tú') }
                    : r
            ).filter(r => r.count > 0)
        );
        setUserReaction(null);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Color System Test</h1>

            {/* ColorPicker Test */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">ColorPicker Component Test</h2>
                <div className="flex items-center gap-4">
                    <span>Selected Color:</span>
                    <ColorPicker
                        selectedColor={selectedColor}
                        onColorChange={setSelectedColor}
                        showLabel={true}
                        size="md"
                    />
                </div>
            </section>

            {/* Card Styling Test */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Card Styling Test</h2>
                <div className="flex flex-wrap gap-4">
                    {colors.map((color) => {
                        const styling = getCardStyling(color);
                        return (
                            <div
                                key={color}
                                className={`p-4 rounded-lg border-2 border-gray-200 min-w-[200px] ${styling}`}
                            >
                                <h3 className="font-medium mb-2">{color}</h3>
                                <p className="text-sm text-gray-600">
                                    This is a test card with {color} background
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Interactive Card Test */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Interactive Card Color Test</h2>
                <div className="flex items-start gap-4">
                    <div className={`p-6 rounded-lg border-2 border-gray-200 min-w-[300px] transition-all duration-300 ${cardStyling}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Test Retrospective Card</h3>
                            <ColorPicker
                                selectedColor={testCardColor}
                                onColorChange={setTestCardColor}
                                size="sm"
                            />
                        </div>
                        <p className="text-gray-700 mb-4">
                            This card demonstrates real-time color changes. Click the color picker to change the background!
                        </p>
                        <div className="text-sm text-gray-500">
                            Current color: <span className="font-medium">{testCardColor}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Size Variants Test */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">ColorPicker Size Variants</h2>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Small:</span>
                        <ColorPicker
                            selectedColor={selectedColor}
                            onColorChange={setSelectedColor}
                            size="sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Medium:</span>
                        <ColorPicker
                            selectedColor={selectedColor}
                            onColorChange={setSelectedColor}
                            size="md"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Large:</span>
                        <ColorPicker
                            selectedColor={selectedColor}
                            onColorChange={setSelectedColor}
                            size="lg"
                        />
                    </div>
                </div>
            </section>

            {/* Color Information Display */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Available Colors Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {colors.map((color) => {
                        const styling = getCardStyling(color);
                        return (
                            <div
                                key={color}
                                className={`p-3 rounded-lg border text-center ${styling}`}
                            >
                                <div className="font-medium text-sm mb-1">{color}</div>
                                <div className="text-xs text-gray-600">
                                    Click to select
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Emoji Reactions Test */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Emoji Reactions Test (Flotante)</h2>
                <div className="flex items-start gap-4">
                    <div className={`p-6 rounded-lg border-2 border-gray-200 min-w-[300px] transition-all duration-300 ${cardStyling}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Test Card con Emojis</h3>
                            <ColorPicker
                                selectedColor={testCardColor}
                                onColorChange={setTestCardColor}
                                size="sm"
                            />
                        </div>
                        <p className="text-gray-700 mb-4">
                            Esta tarjeta demuestra el sistema de emojis flotante. ¡Haz click en el botón + para agregar reacciones!
                        </p>

                        {/* Emoji Reactions Component */}
                        <div className="mt-4">
                            <EmojiReactions
                                cardId="test-card"
                                groupedReactions={testReactions}
                                userReaction={userReaction}
                                onAddReaction={handleAddReaction}
                                onRemoveReaction={handleRemoveReaction}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                    <p className="font-medium mb-2">Características del Emoji Picker Flotante:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>✅ Renderizado con Portal (aparece sobre todo)</li>
                        <li>✅ Posicionamiento inteligente (evita bordes)</li>
                        <li>✅ 12 emojis organizados en 3 categorías</li>
                        <li>✅ Colores temáticos por categoría</li>
                        <li>✅ Navegación por teclado (Escape para cerrar)</li>
                        <li>✅ Click outside para cerrar</li>
                        <li>✅ Estados visuales claros</li>
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default ColorSystemTest;
