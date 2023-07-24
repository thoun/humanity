class MissionsManager extends CardManager<Mission> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `mission-${card.id}`,
            setupDiv: (card: Mission, div: HTMLElement) => { 
                div.classList.add('mission');
                game.setTooltip(div.id, this.getTooltip(card));
                div.dataset.type = ''+card.type;
            },
            setupFrontDiv: (card: Mission, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
            },
            cardWidth: 206,
            cardHeight: 110,
        });
    }

    private getDirection(direction: number): string {
        switch (direction) {
            case 1: return _("vertical");
            case 2: return _("horizontal");
            case 3: return _("diagonal");
        }
    }

    private getTooltip(mission: Mission): string {
        let message = '';
        if (mission.color !== null) {
            message = mission.adjacent ? _("Have at least ${number} adjacent ${color} Modules.") : _("Have at least ${number} ${color} Modules in their base.");
            message = message.replace('${number}', ''+mission.minimum).replace('${color}', this.game.getColor(mission.color, false));
            if (mission.diagonal) {
                message += `<br><br><span color="red">${_("Important: for this Mission only, diagonally adjacent Modules are also counted.")}</span>`;
            }
        } else if (mission.direction !== null) {
            message = mission.sameColor ? _("Have a ${direction} line of at least ${number} adjacent Modules of the same color.") : _("Have a ${direction} line of at least ${number} adjacent Modules, whatever their color.");
            message = message.replace('${number}', ''+mission.minimum).replace('${direction}', this.getDirection(mission.direction));
        } else if (mission.baseType !== null) {
            message = _("Have at least ${number} ${base_icon} and/or ${advanced_icon} pictograms represented on the Experiments they have carried out.");
            message = message.replace('${number}', ''+mission.minimum).replace('${base_icon}', `<div class="resource-icon" data-type="${mission.baseType}"></div>`).replace('${advanced_icon}', `<div class="resource-icon" data-type="${mission.baseType + 10}"></div>`);
        } else if (mission.side !== null) {
            message = _("Have carried out at least ${number} Experiments from the ${side}");
            message = message.replace('${number}', ''+mission.minimum).replace('${side}', this.game.getSide(mission.side));
        }
        return message;
    }
    
    public getHtml(module: Mission): string {
        let html = `<div class="card mission" data-side="front" data-type="${module.type}">
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