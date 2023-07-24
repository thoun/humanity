class ExperimentsManager extends CardManager<Experiment> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `experiment-${card.id}`,
            setupDiv: (card: Experiment, div: HTMLElement) => {
                div.classList.add('experiment');
                div.dataset.cardId = ''+card.id;
                div.dataset.year = ''+card.year;
            },
            setupFrontDiv: (card: Experiment, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
                if (card.number) {
                    game.setTooltip(div.id, this.getTooltip(card));
                }
            },
            isCardVisible: card => Boolean(card.number),
            cardWidth: 150,
            cardHeight: 100,
        });
    }

    private getTooltip(experiment: Experiment): string {
        let message = `
        <strong>${_("Side:")}</strong> ${this.game.getSide(experiment.side)}
        <br>
        <strong>${_("Resources needed:")}</strong> ${getCostStr(experiment.cost)}
        <br>
        <strong>${_("Research points:")}</strong> ${experiment.researchPoints}`;
        if (experiment.effect) {
            message += `<br>
            <strong>${_("Effect:")}</strong> ${this.game.getPower(experiment.effect, 2)}`;
        }
        if (experiment.points) {
            message += `<br>
            <strong>${_("Victory points:")}</strong> ${experiment.points}`;
        }
 
        return message;
    }
    
    public getHtml(module: Experiment): string {
        let html = `<div class="card experiment" data-side="front" data-year="${module.year}">
            <div class="card-sides">
                <div class="card-side front" data-number="${module.number}">
                </div>
                <div class="card-side back">
                </div>
            </div>
        </div>`;
        return html;
    }
}