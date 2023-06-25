class DestinationsManager extends CardManager<Research> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `research-${card.id}`,
            setupDiv: (card: Research, div: HTMLElement) => {
                div.classList.add('research');
                div.dataset.cardId = ''+card.id;
                div.dataset.year = ''+card.year;
            },
            setupFrontDiv: (card: Research, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
                if (card.number) {
                    game.setTooltip(div.id, this.getTooltip(card));
                }
            },
            isCardVisible: card => Boolean(card.number),
            cardWidth: 221,
            cardHeight: 120,
        });
    }

    private getCost(cost: { [color: number]: number }): string {
        const keys = Object.keys(cost).map(c => Number(c));
        if (keys.length == 1 && keys[0] == DIFFERENT) {
            return _("${number} different color cards").replace('${number}', `<strong>${cost[keys[0]]}</strong>`);
        } else if (keys.length == 1 && keys[0] == EQUAL) {
            return _("${number} cards of the same color").replace('${number}', `<strong>${cost[keys[0]]}</strong>`);
        } else {
            return keys.map(color => _("${number} ${color} cards").replace('${number}', `<strong>${cost[color]}</strong>`).replace('${color}', this.game.getTooltipColor(color))).join(', ');
        }
    }

    private getGains(gains: { [type: number]: number }): string {
        return Object.entries(gains).map(entry => `<strong>${entry[1]}</strong> ${this.game.getTooltipGain(Number(entry[0]))}`).join(', ');
    }

    public getType(type: number): string {
        switch (type) {
            case 1: return _("Trading Lands");
            case 2: return _("Lands of Influence");
        }
    }

    private getTooltip(research: Research): string {
        let message = `TODO`;/*
        <strong>${_("Exploration cost:")}</strong> ${this.getCost(research.cost)} (recruits can be used as jokers)
        <br>
        <strong>${_("Immediate gains:")}</strong> ${this.getGains(research.immediateGains)}
        <br>
        <strong>${_("Type:")}</strong> ${this.getType(research.type)}
        `;*/
 
        return message;
    }
}