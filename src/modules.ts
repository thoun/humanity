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

    private getTooltip(module: Module): string {
        let message = `
        <strong>${_("Color:")}</strong> ${this.game.getColor(module.color, true)}
        <br>
        <strong>${_("Resources needed:")}</strong> ${getCostStr(module.cost)}`;
        if (module.workforce) {
            message += `<br>
            <strong>${_("Work points necessary to activate it:")}</strong> ${module.workforce}`;

            if (module.matchType) {
                message += `<br>
                <strong>${_("Effect:")}</strong> ${this.game.getPower(module.matchType, 1)}`;
            }
        }
        if (module.production) {
                const icons = Object.keys(module.production.find(production => Object.values(production).length)).map(type => `<div class="resource-icon" data-type="${type}"></div>`);
                message += `<br>
                <strong>${_("Resources produced:")}</strong> ${icons.join(` ${_("or")} `)}`;
        }
        if (module.adjacentResearchPoints) {
            message += `<br>
            <strong>${_("Research point gained for ${color} adjacent Modules:").replace('${color}', this.game.getColor(module.matchType, false))}</strong> ${module.adjacentResearchPoints}`;
        }
        if (module.researchPoints) {
            message += `<br>
            <strong>${_("Immediate research point gain:")}</strong> ${module.researchPoints}`;
        }
        if (module.points) {
            message += `<br>
            <strong>${_("Victory points:")}</strong> ${module.points}`;
        }
 
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