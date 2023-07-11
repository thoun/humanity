class ObjectivesManager extends CardManager<Objective> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `objective-${card.id}`,
            setupDiv: (card: Objective, div: HTMLElement) => { 
                div.classList.add('objective');
                game.setTooltip(div.id, this.getTooltip(card));
                div.dataset.type = ''+card.type;
            },
            setupFrontDiv: (card: Objective, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
            },
            cardWidth: 206,
            cardHeight: 110,
        });
    }

    private getTooltip(objective: Objective): string {
        let message = '';
        switch (objective.number) {
            case 1: message = _("(+2) if you have 1 or 3 orange cards."); break;
            case 2: message = _("(-2) if orange cards are in the scoring column with either value (1) or value (2)."); break;
            case 3: message = _("(+2) if you have 2 or 4 blue cards."); break;
            case 4: message = _("(+2) if blue is the colour you have the most cards of (or if blue is tied)."); break;
            case 5: message = _("(-2) if you are the player with the least pink cards (or are tied for the least pink cards)."); break;
            case 6: message = _("(+2) if you are the player with the most pink cards (or are tied for the most pink cards)."); break;
            case 7: message = _("(+2) if no colour is on the right of the green column."); break;
            case 8: message = _("(+2) if green cards are in the scoring column with either value (4) or value (5)."); break;
            case 9: message = _("(+2) if you have more purple cards than orange cards (or the same number)."); break;
            case 10: message = _("(-2) if you are the player with the most purple cards (or are tied for the most purple cards)."); break;
            case 11: message = _("(+2) if you have cards in all 5 colours."); break;
            case 12: message = _("(+2) if you have exactly 3 colours."); break;
            case 13: message = _("(-2) if you have at least 1 colour with exactly 3 cards."); break;
            case 14: message = _("(+2) if you have at least 1 colour with exactly 4 cards."); break;
        }

        return message;
        
    }
}