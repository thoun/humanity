class ModulesManager extends CardManager<Module> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `module-${card.id}`,
            setupDiv: (card: Module, div: HTMLElement) => {
                div.classList.add('module');
                div.dataset.type = ''+card.type;
                div.dataset.r = ''+card.r;
            },
            setupFrontDiv: (card: Module, div: HTMLElement) => this.setupFrontDiv(card, div),
            isCardVisible: card => Boolean(card.number) || [0, 8, 9].includes(card.type),
            cardWidth: 150,
            cardHeight: 150,
        });
    }
    
    private setupFrontDiv(card: Module, div: HTMLElement, ignoreTooltip: boolean = false) { 
        div.dataset.number = ''+card.number;
        if (!ignoreTooltip) {
            this.game.setTooltip(div.id, this.getTooltip(card));
        }
    }

    private getTooltip(card: Module): string {
        let message = `TODO`;/*
        <strong>${_("Color:")}</strong> ${this.game.getTooltipColor(card.color)}
        <br>
        <strong>${_("Gain:")}</strong> <strong>1</strong> ${this.game.getTooltipGain(card.gain)}
        `;*/
 
        return message;
    }
    
    public setForHelp(module: Module, divId: string): void {
        const div = document.getElementById(divId);
        div.classList.add('card', 'module');
        div.dataset.side = 'front';
        div.innerHTML = `
        <div class="card-sides">
            <div class="card-side front">
            </div>
            <div class="card-side back">
            </div>
        </div>`
        this.setupFrontDiv(module, div.querySelector('.front'), true);
    }
    
    public getHtml(module: Module): string {
        let html = `<div class="card module" data-side="front" data-type="${module.type}" data-r="${module.r}">
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