const POINT_CASE_SIZE_LEFT = 38.8;
const POINT_CASE_SIZE_TOP = 37.6;

class ResearchBoard {
    private vp = new Map<number, number>();
    private researchPoints = new Map<number, number>(); 
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        const players = Object.values(gamedatas.players);
        let html = '';
        // points
        players.forEach(player =>
            html += `
            <div id="player-${player.id}-vp-marker" class="marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" data-color="${player.color}"><div class="inner vp"></div></div>
            <div id="player-${player.id}-research-marker" class="marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" data-color="${player.color}"><div class="inner research"></div></div>
            `
        );
        dojo.place(html, 'research-board');
        players.forEach(player => {
            this.vp.set(Number(player.id), Number(player.score));
            this.researchPoints.set(Number(player.id), Math.min(14, Number(player.research)));
        });
        this.moveVP();
        this.moveResearch();
    }

    private getVPCoordinates(points: number) {
        const cases = points % 40;

        const top = cases >= 16 ? (cases > 36 ? (40 - cases) : Math.min(4, cases - 16)) * POINT_CASE_SIZE_TOP : 0;
        const left = cases > 20 ? (36 - Math.min(cases, 36)) * POINT_CASE_SIZE_LEFT : Math.min(16, cases) * POINT_CASE_SIZE_LEFT;

        return [22 + left, 39 + top];
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
        const cases = points;

        const top = cases % 2 ? -14 : 0;
        const left = cases * 16.9;

        return [368 + left, 123 + top];
    }

    private moveResearch() {
        this.researchPoints.forEach((points, playerId) => {
            const markerDiv = document.getElementById(`player-${playerId}-research-marker`);

            const coordinates = this.getResearchCoordinates(points);
            const left = coordinates[0];
            const top = coordinates[1];
    
            let topShift = 0;
            let leftShift = 0;
            this.researchPoints.forEach((iPoints, iPlayerId) => {
                if (iPoints === points && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
    
            markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
        });
    }
    
    public setResearch(playerId: number, research: number) {
        this.researchPoints.set(playerId, Math.min(14, research));
        this.moveResearch();
    }
    
    public getResearch(playerId: number): number {
        return this.researchPoints.get(playerId);
    }

    // TODO keep?
    public highlightPlayerTokens(playerId: number | null) {
        document.querySelectorAll('#research-board .marker').forEach((elem: HTMLElement) => elem.classList.toggle('highlight', Number(elem.dataset.playerId) === playerId));
    }
}