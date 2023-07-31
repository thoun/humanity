class AstronautsManager {
    constructor(private game: HumanityGame) {}

    public createAstronaut(astronaut: Astronaut): HTMLDivElement {
        const astronautDiv = document.createElement('div');
        astronautDiv.id = `astronaut-${astronaut.id}`;
        astronautDiv.classList.add('astronaut');
        astronautDiv.dataset.id = `${astronaut.id}`;
        astronautDiv.dataset.playerColor = this.game.getPlayer(astronaut.playerId).color;
        astronautDiv.dataset.workforce = `${astronaut.workforce}`;
        astronautDiv.dataset.remainingWorkforce = `${astronaut.remainingWorkforce}`;

        astronautDiv.addEventListener('click', () => {
            if (astronautDiv.classList.contains('selectable')) {
                this.game.onAstronautClick(astronaut);
            }
        });
        
        const workforceDiv = document.createElement('div');
        workforceDiv.id = `${astronautDiv.id}-force`;
        workforceDiv.classList.add('workforce');
        astronautDiv.appendChild(workforceDiv);

        return astronautDiv;
    }

    private getAstronautDiv(astronaut: Astronaut) {
        return document.getElementById(`astronaut-${astronaut.id}`);
    }
    
    public setSelectedAstronaut(selectedAstronaut: Astronaut) {
        document.querySelectorAll('.astronaut').forEach((astronaut: HTMLDivElement) => 
            astronaut.classList.toggle('selected', selectedAstronaut?.id == Number(astronaut.dataset.id))
        );
    }

    public moveAstronautDiv(astronaut: Astronaut) {
        const astronautDiv = this.getAstronautDiv(astronaut);
        if (astronaut.location == 'player') {
            const modulesDiv = document.getElementById(`player-table-${astronaut.playerId}-modules`);
            modulesDiv.querySelector(`[data-slot-id="${astronaut.x}_${astronaut.y}"]`).appendChild(astronautDiv);
        } else if (astronaut.location == 'table') {
            const tableAstronauts = document.getElementById('table-astronauts');
            tableAstronauts.querySelector(`.slot[data-slot-id="${astronaut.spot}"]`).appendChild(astronautDiv);
        }
    }

    public resetAstronaut(astronaut: Astronaut) {
        this.moveAstronautDiv(astronaut);
        this.updateAstronaut(astronaut);
    }

    public updateAstronaut(astronaut: Astronaut) {
        const div = this.getAstronautDiv(astronaut);
        div.dataset.remainingWorkforce = `${astronaut.remainingWorkforce}`;
        div.dataset.workforce = `${astronaut.workforce}`;
    }

    public setAstronautToConfirm(astronaut: Astronaut, toConfirm: boolean) {
        this.getAstronautDiv(astronaut).classList.toggle('to-confirm', toConfirm);
    }
}