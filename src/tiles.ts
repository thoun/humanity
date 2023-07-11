class TilesManager extends CardManager<Tile> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `tile-${card.id}`,
            setupDiv: (card: Tile, div: HTMLElement) => {
                div.classList.add('tile');
                div.dataset.type = ''+card.type;
                div.dataset.r = ''+card.r;
            },
            setupFrontDiv: (card: Tile, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
                game.setTooltip(div.id, this.getTooltip(card));
            },
            isCardVisible: card => Boolean(card.number) || [0, 8, 9].includes(card.type),
            cardWidth: 150,
            cardHeight: 150,
        });
    }

    private getTooltip(card: Tile): string {
        let message = `x ${card.x}<br>
        y ${card.y}`;/*
        <strong>${_("Color:")}</strong> ${this.game.getTooltipColor(card.color)}
        <br>
        <strong>${_("Gain:")}</strong> <strong>1</strong> ${this.game.getTooltipGain(card.gain)}
        `;*/
 
        return message;
    }
}