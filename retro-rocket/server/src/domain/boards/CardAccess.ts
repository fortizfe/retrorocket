/** FR-004: only a card's author may edit or delete it. */
export function isCardOwner(card: { createdBy: string }, uid: string): boolean {
    return uid !== '' && uid === card.createdBy;
}
