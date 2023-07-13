const POINT_CASE_HALF_WIDTH = 20.82;
const POINT_CASE_TWO_THIRD_HEIGHT = 36.25;

const RESEARCH_CASE_WIDTH = 40.71;
const RESEARCH_CASE_HEIGHT = 33.5;

class ResearchBoard {
    private objectives: SlotStock<Objective>;
    private vp = new Map<number, number>();
    private sciencePoints = new Map<number, number>(); 
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        const players = Object.values(gamedatas.players);
        let html = '';
        // points
        players.forEach(player =>
            html += `
            <div id="player-${player.id}-vp-marker" class="vp marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" style="--color: #${player.color};"><div class="inner vp"></div></div>
            <div id="player-${player.id}-research-marker" class="research marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" style="--color: #${player.color};"><div class="inner research"></div></div>
            `
        );
        dojo.place(html, 'research-board');
        players.forEach(player => {
            this.vp.set(Number(player.id), Number(player.score));
            this.sciencePoints.set(Number(player.id), Math.min(14, Number(player.researchSpot)));
        });
        this.moveVP();
        this.moveResearch();
        
        this.objectives = new SlotStock<Objective>(this.game.objectivesManager, document.getElementById(`objectives`), {
            slotsIds: [1, 2, 3],
            mapCardToSlot: card => card.locationArg,
        });
        this.objectives.addCards(gamedatas.tableObjectives);
    }

    private getVPCoordinates(points: number) {
        const cases = Math.min(points, 40);

        let top = 0;
        let left = 0;

        if (cases > 0 && cases < 12) {
            left = POINT_CASE_HALF_WIDTH * 2 * cases;
        } else if (cases == 12) {
            top = POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 23;
        } else if (cases > 12 && cases < 25) {
            top = 2 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 2 * (24 - cases);
        } else if (cases == 25) {
            top = 3 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * -1;
        } else if (cases > 25 && cases < 39) {
            top = 4 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 2 * (cases - 26);
        } else if (cases == 39) {
            top = 3 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 25;
        } else if (cases == 40) {
            top = 2 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 26;
        }

        return [40 + left, 27 + top];
    }

    private moveVP() {
        this.vp.forEach((points, playerId) => {
            const markerDiv = document.getElementById(`player-${playerId}-vp-marker`);

            const coordinates = this.getVPCoordinates(points);
            const left = coordinates[0];
            const top = coordinates[1];
    
            let topShift = 0;
            let leftShift = 0;
            this.vp.forEach((iPoints, iPlayerId) => {
                if (iPoints % 40 === points % 40 && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
    
            markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
        });
    }
    
    setScore(playerId: number, points: number) {
        this.vp.set(playerId, points);
        this.moveVP();
    }

    private getResearchCoordinates(points: number) {
        const cases = Math.min(points, 50);

        let top = 0;
        let left = RESEARCH_CASE_WIDTH * 7;

        if (cases > 0 && cases < 8) {
            left = RESEARCH_CASE_WIDTH * (cases + 7);
        } else if (cases == 8) {
            top = RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * 14;
        } else if (cases > 8 && cases < 23) {
            top = 2 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (23 - cases);
        } else if (cases == 23) {
            top = 3 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH;
        } else if (cases > 23 && cases < 38) {
            top = 4 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (cases - 23);
        } else if (cases == 38) {
            top = 5 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * 14;
        } else if (cases > 38) {
            top = 6 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (53 - cases);
        }

        return [-10 + left, 253 + top];
    }

    private moveResearch() {
        this.sciencePoints.forEach((points, playerId) => {
            const markerDiv = document.getElementById(`player-${playerId}-research-marker`);

            const coordinates = this.getResearchCoordinates(points);
            const left = coordinates[0];
            const top = coordinates[1];
    
            let topShift = 0;
            let leftShift = 0;
            this.sciencePoints.forEach((iPoints, iPlayerId) => {
                if (iPoints === points && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
    
            markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
        });
    }
    
    public setResearchSpot(playerId: number, researchSpot: number) {
        this.sciencePoints.set(playerId, researchSpot);
        this.moveResearch();
    }
    
    public getResearchSpot(playerId: number): number {
        return this.sciencePoints.get(playerId);
    }

    // TODO keep?
    public highlightPlayerTokens(playerId: number | null) {
        document.querySelectorAll('#research-board .marker').forEach((elem: HTMLElement) => elem.classList.toggle('highlight', Number(elem.dataset.playerId) === playerId));
    }
}