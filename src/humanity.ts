declare const define;
declare const ebg;
declare const $;
declare const dojo: Dojo;
declare const _;
declare const g_gamethemeurl;

const ANIMATION_MS = 500;
const SCORE_MS = 1500;
const ACTION_TIMER_DURATION = 5;

const LOCAL_STORAGE_ZOOM_KEY = 'Humanity-zoom';
const LOCAL_STORAGE_JUMP_TO_FOLDED_KEY = 'Humanity-jump-to-folded';
const LOCAL_STORAGE_HELP_FOLDED_KEY = 'Humanity-help-folded';

const ICONS_COUNTERS_TYPES = [1, 2, 3, 0];

const ANY_COLOR = 0;
const BLUE_OR_ORANGE = 0;
const ORANGE = 1;
const BLUE = 2;
const PURPLE = 3;
const GREEN = 4;

function getCostStr(cost: Icons) {
    return Object.entries(cost).filter(entry => entry[1] > 0).map(entry => `${entry[1]} <div class="resource-icon" data-type="${entry[0]}"></div>`).join(' ');
}

class Humanity implements HumanityGame {
    public astronautsManager: AstronautsManager;
    public modulesManager: ModulesManager;
    public experimentsManager: ExperimentsManager;
    public missionsManager: MissionsManager;

    private zoomManager: ZoomManager;
    private animationManager: AnimationManager;
    private gamedatas: HumanityGamedatas;
    private tableCenter: TableCenter;
    private researchBoard: ResearchBoard;
    private playersTables: PlayerTable[] = [];
    private vpCounters: Counter[] = [];
    private scienceCounters: Counter[] = [];
    private iconsCounters: Counter[][] = [];
    private yearCounter: Counter;
    
    private TOOLTIP_DELAY = document.body.classList.contains('touch-device') ? 1500 : undefined;

    constructor() {
    }
    
    /*
        setup:

        This method must set up the game user interface according to current game situation specified
        in parameters.

        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)

        "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
    */

    public setup(gamedatas: HumanityGamedatas) {
        log( "Starting game setup" );
        
        this.gamedatas = gamedatas;

        log('gamedatas', gamedatas);

        this.astronautsManager = new AstronautsManager(this);
        this.modulesManager = new ModulesManager(this);
        this.experimentsManager = new ExperimentsManager(this);        
        this.missionsManager = new MissionsManager(this);
        this.animationManager = new AnimationManager(this);
        new JumpToManager(this, {
            localStorageFoldedKey: LOCAL_STORAGE_JUMP_TO_FOLDED_KEY,
            topEntries: [
                new JumpToEntry('AMBS', 'board-1', { 'color': '#224757' }),
                new JumpToEntry(_('Research track'), 'research-board', { 'color': '#224757' }),
            ],
            entryClasses: 'hexa-point',
            defaultFolded: false,
        });

        this.tableCenter = new TableCenter(this, gamedatas);
        this.createPlayerPanels(gamedatas);
        this.createPlayerTables(gamedatas);   
        this.researchBoard = new ResearchBoard(this, gamedatas);   

        document.getElementById(`year`).insertAdjacentText('beforebegin', _('Year') + ' ');
        this.yearCounter = new ebg.counter();
        this.yearCounter.create(`year`);
        this.yearCounter.setValue(gamedatas.year);

        gamedatas.movedAstronauts?.forEach(astronaut => {
            if (astronaut.location == 'table' && astronaut.x !== null) {
                astronaut.location = 'player';
                this.astronautsManager.moveAstronautDiv(astronaut);
                this.astronautsManager.setAstronautToConfirm(astronaut, true);
            }
        });
        
        this.zoomManager = new ZoomManager({
            element: document.getElementById('table'),
            smooth: false,
            zoomControls: {
                color: 'black',
            },
            localStorageZoomKey: LOCAL_STORAGE_ZOOM_KEY,
            onDimensionsChange: () => {
                const tablesAndCenter = document.getElementById('tables-and-center');
                const clientWidth = tablesAndCenter.clientWidth;
                const tablesWidth = Math.max(640/*, document.getElementById('tables').clientWidth*/);
                tablesAndCenter.classList.toggle('double-column', clientWidth > 1201 + tablesWidth); // 1181 + 20 + tablesWidth

                /*const centerWrapper = document.getElementById('table-center-wrapper');
                const centerClientWidth = centerWrapper.clientWidth;
                centerWrapper.classList.toggle('double-column', centerClientWidth > 2033); // 1181 + 852      */          
            },
        });

        const helpButtons: BgaHelpButton[] = [
            new BgaHelpPopinButton({
                title: _("Tile details").toUpperCase(),
                html: this.getHelpHtml(),
                buttonBackground: '#ba3c1e',
            }),
        ];
        const currentPlayerColor = this.getPlayer(this.getPlayerId())?.color;
        if (currentPlayerColor) {
            helpButtons.push(
                new BgaHelpExpandableButton({
                    expandedWidth: '843px',
                    expandedHeight: '370px',
                    defaultFolded: true,
                    localStorageFoldedKey: LOCAL_STORAGE_HELP_FOLDED_KEY,
                    buttonExtraClasses: `player-color-${currentPlayerColor}`
                })
            );
        }

        new HelpManager(this, { 
            buttons: helpButtons
        });
        this.setupNotifications();
        this.setupPreferences();

        [1, 2, 3].forEach(year => {
            document.getElementById(`years-progress`).insertAdjacentHTML(`beforeend`, `
                <div id="year-progress-${year}" class="year-progress">
                    <div id="in-year-progress-${year}" class="in-year-progress"></div>
                </div>
            `);
        });
        this.setProgress(gamedatas.year, gamedatas.isEnd ? 101 : gamedatas.inYearProgress);

        if (gamedatas.isEnd) { // score or end
            this.onEnteringShowScore(true);
        }

        log( "Ending game setup" );
    }

    private setProgress(currentYear: number, inYearProgress: number) {
        [1, 2, 3].forEach(year => {
            document.getElementById(`year-progress-${year}`).classList.toggle('finished', currentYear > year || (currentYear == 3 && inYearProgress > 100));
        });
        document.getElementById(`in-year-progress-${currentYear}`).style.width = `${Math.min(100, inYearProgress)}%`;
    }

    ///////////////////////////////////////////////////
    //// Game & client states

    // onEnteringState: this method is called each time we are entering into a new game state.
    //                  You can use this method to perform some user interface changes at this moment.
    //
    public onEnteringState(stateName: string, args: any) {
        log('Entering state: ' + stateName, args.args);

        if (args.args?.astronaut && (this as any).isCurrentPlayerActive()) {
            this.astronautsManager.setSelectedAstronaut(args.args.astronaut);
        }

        switch (stateName) {
            case 'chooseAction':
                this.onEnteringChooseAction(args.args);
                break;
            case 'activateModule':
                this.onEnteringActivateModule(args.args);
                break;
            case 'pay':
                this.onEnteringPay(args.args);
                break;
            case 'chooseAstronaut':
                this.onEnteringChooseAstronaut(args.args);
                break;
            case 'upgradeAstronaut':
                this.onEnteringUpgradeAstronaut(args.args);
                break;
            case 'moveAstronaut':
                this.onEnteringMoveAstronaut(args.args);
                break;
            case 'endScore':
                this.onEnteringShowScore();
                break;
        }
    }

    private onEnteringChooseAction(args: EnteringChooseActionArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectableModules(args.activatableModules);
            this.tableCenter.setSelectableModules(args.selectableModules);
            this.tableCenter.setSelectableExperiments(args.selectableExperiments);
        }
    }
    
    public onEnteringActivateModule(args: EnteringActivateModuleArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectableModules(args.activatableModules);
        }
    }

    private onEnteringPay(args: EnteringPayArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setPayButtons(args.payButtons);
        }
    }

    private onEnteringChooseAstronaut(args: EnteringChooseAstronautArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setSelectableAstronauts(args.astronauts);
        }
    }

    private onEnteringUpgradeAstronaut(args: EnteringChooseAstronautArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            args.astronauts.forEach(astronaut => document.getElementById(`astronaut-${astronaut.id}`).classList.add('selectable'));
        }
    }

    private onEnteringMoveAstronaut(args: EnteringMoveAstronautArgs) {
        this.getCurrentPlayerTable()?.setSelectableModuleSpots(args.possibleCoordinates);
    }

    private onEnteringShowScore(fromReload: boolean = false) {
        document.getElementById('score').style.display = 'flex';

        document.getElementById('score-table-body').innerHTML = [
            _("Remaining resources points"),
            _("Squares points"),
            _("Greenhouses points"),
            _("Experiments points"),
            _("Missions points"),
            _("Modules points"),
            _("Science points"),
            _("Total"),
        ].map(label => `<tr><th>${label}</th></tr>`).join('');

        const players = Object.values(this.gamedatas.players);
        players.forEach(player => this.addPlayerSummaryColumn(Number(player.id), player.endScoreSummary)); 
    }
    
    private addPlayerSummaryColumn(playerId: number, endScoreSummary?: PlayerEndScoreSummary): void {
        const player = this.getPlayer(playerId);
        document.getElementById('scoretr').insertAdjacentHTML('beforeend', `<th class="player_name" style="color: #${player.color}">${player.name}</th>`);

        const lines = Array.from(document.getElementById('score-table-body').getElementsByTagName('tr'));
        lines[0].insertAdjacentHTML(`beforeend`, `<td id="score-remainingResources-${playerId}">${endScoreSummary?.remainingResources ?? ''}</td>`);
        lines[1].insertAdjacentHTML(`beforeend`, `<td id="score-squares-${playerId}">${endScoreSummary?.squares ?? ''}</td>`);
        lines[2].insertAdjacentHTML(`beforeend`, `<td id="score-greenhouses-${playerId}">${endScoreSummary?.greenhouses ?? ''}</td>`);
        lines[3].insertAdjacentHTML(`beforeend`, `<td id="score-experiments-${playerId}">${endScoreSummary?.experiments ?? ''}</td>`);
        lines[4].insertAdjacentHTML(`beforeend`, `<td id="score-missions-${playerId}">${endScoreSummary?.missions ?? ''}</td>`);
        lines[5].insertAdjacentHTML(`beforeend`, `<td id="score-modules-${playerId}">${endScoreSummary?.modules ?? ''}</td>`);
        lines[6].insertAdjacentHTML(`beforeend`, `<td id="score-scienceByYear-${playerId}">${endScoreSummary?.scienceByYear.map((points, index) => `<div>${points} <span class="score-year">(${_('Year')} ${index + 1})</span></div>`).join('') ?? ''}</td>`);
        lines[7].insertAdjacentHTML(`beforeend`, `<td id="score-total-${playerId}">${endScoreSummary?.total ?? ''}</td>`);
    }

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        this.astronautsManager.setSelectedAstronaut(null);

        switch (stateName) {
            case 'chooseAction':
                this.onLeavingChooseAction();
                break;
            case 'activateModule':
                this.onLeavingActivateModule();
                break;
            case 'pay':
            case 'chooseCommunicationColor':
                this.onLeavingPay();
                break;
            case 'chooseAstronaut':
                this.onLeavingChooseAstronaut();
                break;
            case 'moveAstronaut':
                this.onLeavingMoveAstronaut();
                break;
            case 'upgradeAstronaut':
                this.onLeavingUpgradeAstronaut();
                break;
        }
    }
    
    public onLeavingChooseAction() {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectableModules(null);
            this.tableCenter.setSelectableModules(null);
            this.tableCenter.setSelectableExperiments(null);
        }
    }
    
    public onLeavingActivateModule() {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectableModules(null);
        }
    }
    
    public onLeavingPay() {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.removePayButtons();
        }
    }

    private onLeavingChooseAstronaut() {
        this.getCurrentPlayerTable()?.setSelectableAstronauts([]);
    }

    private onLeavingMoveAstronaut() {
        this.getCurrentPlayerTable()?.setSelectableModuleSpots(null);
    }

    private onLeavingUpgradeAstronaut() {
        document.querySelectorAll('.astronaut.selectable').forEach(astronaut => astronaut.classList.remove('selectable'));
    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'activateModule':
                    (this as any).addActionButton(`endTurn_button`, _("End turn"), () => this.endTurn());
                    break;
                case 'chooseCommunicationColor':
                    (this as any).addActionButton(`blue_button`, _("Blue"), () => this.chooseCommunicationColor(2));
                    (this as any).addActionButton(`orange_button`, _("Orange"), () => this.chooseCommunicationColor(1));
                    break;
                case 'pay':
                    if (args.autoPay) {
                        (this as any).addActionButton(`autoPay_button`, _("Automatically spend ${cost}").replace('${cost}', getCostStr(args.autoPay)), () => this.autoPay());
                    }
                    break;
                case 'confirmTurn':
                    (this as any).addActionButton(`confirmTurn_button`, _("Confirm turn"), () => this.confirmTurn());
                    break;
                case 'moveAstronaut':
                    if (args.canUndo) {
                        (this as any).addActionButton(`undoMoveAstronaut_button`, _("Undo last move"), () => this.undoMoveAstronaut(), null, null, 'red');
                    }
                    break;
                case 'confirmMoveAstronauts':
                    (this as any).addActionButton(`confirmMoveAstronauts_button`, _("Confirm"), () => this.confirmMoveAstronauts());
                    (this as any).addActionButton(`undoMoveAstronaut_button`, _("Undo last move"), () => this.undoMoveAstronaut(), null, null, 'red');
                    break;
            }

            
            if (['chooseCommunicationColor', 'pay', 'chooseAction', 'upgradeAstronaut', 'activateModule', 'confirmTurn'].includes(stateName)) {
                (this as any).addActionButton(`restartTurn_button`, _("Restart turn"), () => this.restartTurn(), null, null, 'red');
            }
        } else {
            if (stateName == 'moveAstronauts' && args.activePlayersIds?.includes(this.getPlayerId())) { // only players that were active
                (this as any).addActionButton(`cancelConfirmAstronaut-button`, _("Undo last move"), () => this.cancelConfirmAstronaut(), null, null, 'gray');
            }
        }
    }

    ///////////////////////////////////////////////////
    //// Utility methods


    ///////////////////////////////////////////////////

    public setTooltip(id: string, html: string) {
        (this as any).addTooltipHtml(id, html, this.TOOLTIP_DELAY);
    }
    public setTooltipToClass(className: string, html: string) {
        (this as any).addTooltipHtmlToClass(className, html, this.TOOLTIP_DELAY);
    }

    public getPlayerId(): number {
        return Number((this as any).player_id);
    }

    public getPlayer(playerId: number): HumanityPlayer {
        return Object.values(this.gamedatas.players).find(player => Number(player.id) == playerId);
    }

    public getPlayerTable(playerId: number): PlayerTable {
        return this.playersTables.find(playerTable => playerTable.playerId === playerId);
    }

    public getCurrentPlayerTable(): PlayerTable | null {
        return this.playersTables.find(playerTable => playerTable.playerId === this.getPlayerId());
    }

    public getGameStateName(): string {
        return this.gamedatas.gamestate.name;
    }

    private setupPreferences() {
        // Extract the ID and value from the UI control
        const onchange = (e) => {
          var match = e.target.id.match(/^preference_[cf]ontrol_(\d+)$/);
          if (!match) {
            return;
          }
          var prefId = +match[1];
          var prefValue = +e.target.value;
          (this as any).prefs[prefId].value = prefValue;
        }
        
        // Call onPreferenceChange() when any value changes
        dojo.query(".preference_control").connect("onchange", onchange);
        
        // Call onPreferenceChange() now
        dojo.forEach(
          dojo.query("#ingame_menu_content .preference_control"),
          el => onchange({ target: el })
        );
    }

    private getOrderedPlayers(gamedatas: HumanityGamedatas) {
        const players = Object.values(gamedatas.players).sort((a, b) => a.playerNo - b.playerNo);
        const playerIndex = players.findIndex(player => Number(player.id) === Number((this as any).player_id));
        const orderedPlayers = playerIndex > 0 ? [...players.slice(playerIndex), ...players.slice(0, playerIndex)] : players;
        return orderedPlayers;
    }

    private createPlayerPanels(gamedatas: HumanityGamedatas) {

        Object.values(gamedatas.players).forEach(player => {
            const playerId = Number(player.id);

            let html = `<div class="counters with-tokens">            
                <div id="vp-counter-wrapper-${player.id}" class="vp-counter">
                    <div class="vp icon"></div>
                    <span id="vp-counter-${player.id}"></span>
                </div>
                <div id="science-counter-wrapper-${player.id}" class="science-counter">
                    <div class="science icon"></div>
                    <span id="science-counter-${player.id}">?</span>
                </div>
            </div>

            <div id="player-${player.id}-icons" class="icons counters"></div>`;

            dojo.place(html, `player_board_${player.id}`);

            this.vpCounters[playerId] = new ebg.counter();
            this.vpCounters[playerId].create(`vp-counter-${playerId}`);
            this.vpCounters[playerId].setValue(player.vp);

            if (gamedatas.isEnd || playerId == this.getPlayerId()) {
                this.scienceCounters[playerId] = new ebg.counter();
                this.scienceCounters[playerId].create(`science-counter-${playerId}`);
                this.scienceCounters[playerId].setValue(player.science);
            } 

            this.iconsCounters[playerId] = [];
            this.updateIcons(playerId, player.icons);

            // first player token
            dojo.place(`<div id="player_board_${player.id}_firstPlayerWrapper" class="firstPlayerWrapper"></div>`, `player_board_${player.id}`);

            if (gamedatas.firstPlayerId === playerId) {
                this.placeFirstPlayerToken(gamedatas.firstPlayerId);
            }
        });

        this.setTooltipToClass('vp-counter', _('Victory points'));
        this.setTooltipToClass('science-counter', _('Science points'));

        document.getElementById(`player_boards`).insertAdjacentHTML('beforeend', `
        <div id="overall_player_board_0" class="player-board current-player-board">					
            <div class="player_board_inner" id="player_board_inner_research-positions">
                <div id="research-positions"></div>
            </div>
        </div>`);
        this.setTooltip('player_board_inner_research-positions', _('Player order in research track, and associated Science points'));
    }

    private updateIcons(playerId: number, icons: Icons) {
        const keys = Object.keys(icons);
        keys.forEach(key => {
            const quantity = icons[key];
            if (!this.iconsCounters[playerId][key]) {
                const icons = JSON.parse(key) as number[];
                const iconsHtml = icons.map(type => `<div class="resource-icon" data-type="${type}"></div>`).join('');
                const order = icons.length > 1 ? 100 * icons[0] + icons[1] : icons[0];
                const tooltip = icons.length > 1 ? _('${a} or ${b}').replace('${a}', this.getResourceTooltip(icons[0])).replace('${b}', this.getResourceTooltip(icons[1])) : this.getResourceTooltip(icons[0]);

                document.getElementById(`player-${playerId}-icons`).insertAdjacentHTML('beforeend',
                `<div id="type-${key}-counter-wrapper-${playerId}" style="order: ${order};">
                    <span class="${icons.length > 1 ? 'double-icons' : ''}">${iconsHtml}</span> <span id="type-${key}-counter-${playerId}"></span>
                </div>`
                );

                this.iconsCounters[playerId][key] = new ebg.counter();
                this.iconsCounters[playerId][key].create(`type-${key}-counter-${playerId}`);
                this.iconsCounters[playerId][key].setValue(quantity);
                this.setTooltip(`type-${key}-counter-wrapper-${playerId}`, tooltip);
            } else {
                this.iconsCounters[playerId][key].toValue(quantity);
            }
        });

        Object.keys(this.iconsCounters[playerId]).filter(key => !keys.includes(key)).forEach(key => {
            document.getElementById(`type-${key}-counter-wrapper-${playerId}`)?.remove();
            this.iconsCounters[playerId][key] = null;
        });
    }

    private createPlayerTables(gamedatas: HumanityGamedatas) {
        const orderedPlayers = this.getOrderedPlayers(gamedatas);

        orderedPlayers.forEach(player => 
            this.createPlayerTable(gamedatas, Number(player.id))
        );
    }

    private createPlayerTable(gamedatas: HumanityGamedatas, playerId: number) {
        const table = new PlayerTable(this, gamedatas.players[playerId]);
        this.playersTables.push(table);
    }

    placeFirstPlayerToken(playerId: number): Promise<any> {
        const firstPlayerToken = document.getElementById('firstPlayerToken');
        if (firstPlayerToken) {
            this.animationManager.attachWithAnimation(
                new BgaSlideAnimation({
                    element: firstPlayerToken,
                }),
                document.getElementById(`player_board_${playerId}_firstPlayerWrapper`),
            );
        } else {
            dojo.place('<div id="firstPlayerToken"></div>', `player_board_${playerId}_firstPlayerWrapper`);

            (this as any).addTooltipHtml('firstPlayerToken', _("First Player token"));

            return Promise.resolve(true);
        }
    }

    private setScore(playerId: number, score: number) {
        (this as any).scoreCtrl[playerId]?.toValue(score);
    }

    private setVP(playerId: number, count: number) {
        this.researchBoard.setVP(playerId, count);
        this.vpCounters[playerId].toValue(count);
    }

    private setScience(playerId: number, count: number) {
        if (this.scienceCounters[playerId]) {
            this.scienceCounters[playerId].toValue(count);
        } else {
            this.scienceCounters[playerId] = new ebg.counter();
            this.scienceCounters[playerId].create(`science-counter-${playerId}`);
            this.scienceCounters[playerId].setValue(count);
        }
    }

    private setResearchPoints(playerId: number, count: number) {
        this.researchBoard.setResearchPoints(playerId, count);
    }

    private getHelpHtml() {
        let html = `
        <div id="help-popin">
            <h1>${_("Experiment Tiles")}</h1>

            <div class="help-section">
                <div><span class="legend-number">1</span> ${_("Resources needed to carry it out")}</div>
                <div><span class="legend-number">2</span> ${_("Research points")}</div>
                <div><span class="legend-number">3</span> ${_("Effect")}</div>
                <div><span class="legend-number">4</span> ${_("Victory point (only for Year 3)")}</div>
                <div class="tiles">
                    <div class="legend-tile-wrapper">
                        ${this.experimentsManager.getHtml({ year: 3, number: 2 } as Experiment)}
                        <div class="legend-number" style="left: 10px; bottom: 0px;">1</div>
                        <div class="legend-number" style="left: 49px; top: 2px;">2</div>
                        <div class="legend-number" style="left: 81px; top: 2px;">3</div>
                        <div class="legend-number" style="right: -26px; top: -8px;">4</div>
                    </div>
                </div>

                <h2><div class="reactivate icon"></div></h2>
                <div>${this.getPower(1, 2)}</div>
                <h2><div class="time-unit icon"></div></h2>
                <div>${this.getPower(2, 2)}</div>
            </div>

            <h1>${_("Module Tiles")}</h1>

            <div class="help-section">
                <div><span class="legend-number">1</span> ${_("Resources necessary for deployment")}</div>
                <div><span class="legend-number">2</span> ${_("Number of Work points necessary to activate it")}</div>
                <div><span class="legend-number">3</span> ${_("Quantity and type of resources produced")}</div>
                <div><span class="legend-number">4</span> ${_("Research point gained for adjacent Modules")}</div>
                <div><span class="legend-number">5</span> ${_("Immediate research point gain")}</div>
                <div class="tiles">
                    <div class="legend-tile-wrapper">
                        ${this.modulesManager.getHtml({ type: 1, number: 8, r: 1 } as Module)}
                        <div class="legend-number" style="left: 0; bottom: 0;">1</div>
                        <div class="legend-number" style="left: 49px; bottom: -22px;">2</div>
                        <div class="legend-number" style="left: 101px; bottom: 3px;">3</div>
                    </div>
                    <div class="legend-tile-wrapper">
                        ${this.modulesManager.getHtml({ type: 1, number: 11 } as Module)}
                        <div class="legend-number" style="left: 0; bottom: 0;">1</div>
                        <div class="legend-number" style="left: -14px; top: 64px;">4</div>
                        <div class="legend-number" style="right: -14px; top: 64px;">4</div>
                        <div class="legend-number" style="left: 64px; bottom: -14px;">4</div>
                        <div class="legend-number" style="right: 2px; bottom: 2px;">5</div>
                    </div>
                </div>
            </div>

            <h2>${_("Production modules")}</h2>

            <div class="help-section">
                <div>${_("This type of Module requires 1 Work point to activate and produces 1 basic resource that can be spent later.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 0, number: 2, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 0, number: 1, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 0, number: 3, r: 1 } as Module)}
                </div>
            </div>

            <div class="help-section">
                <div>${_("This type of Module requires 1 Work point to activate and produces 1 variable basic resource. But, the player does not have to choose which resource type it is until they spend it later on. If they decide to spend several resources from this Module at once, they can choose different resources for each.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 1, number: 4, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 1, number: 5, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 1, number: 6, r: 1 } as Module)}
                </div>
            </div>

            <div class="help-section">
                <div>${_("This type of Module requires 2 Work points to activate and produces 1 advanced resource, that can be spent later.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 0, number: 4, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 1, number: 7, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 1, number: 8, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 1, number: 9, r: 1 } as Module)}
                </div>
            </div>

            <div class="help-section">
                <div>${_("This type of Module requires 2 Work point to activate and produces 1 variable advanced resource. But, the player does not have to choose which resource type it is until they spend it later on. If they decide to spend several resources from this Module at once, they can choose different resources for each.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 2, number: 6, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 2, number: 7, r: 1 } as Module)}
                    ${this.modulesManager.getHtml({ type: 2, number: 8, r: 1 } as Module)}
                </div>
            </div>

            <div class="help-section">
                <div>${_("This type of Module requires 1 Work point to activate and produces 1 electricity that can be spent later. Players can spend 1 electricity to replace 1 basic resource (methane, ice, or insect).")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 2, number: 4, r: 1 } as Module)}
                </div>
            </div>

            <div class="help-section">
                <div>${_("This type of Module requires 1 Work point to activate and produces 1 Time unit <strong>that must be spent immediately</strong>: <strong>All</strong> of that player’s Astronauts around the main board are moved 1 hangar counterclockwise. Astronauts cannot be moved beyond the articulated arm.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 1, number: 3, r: 0 } as Module)}
                </div>
            </div>

            <h2>${_("Modules that Earn Research Points")}</h2>

            <div class="help-section">
                <div>${_("When a Communications Module is deployed, the player chooses whether it is blue or orange. This tile is then discarded and either a blue tile or an orange tile is taken from the additional Communications Modules for the current year, matching the player’s choice. It is placed in their Base following the usual rules.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 1, number: 1 } as Module)}
                    =&gt;
                    ${this.modulesManager.getHtml({ type: 8, number: 1 } as Module)}
                    /
                    ${this.modulesManager.getHtml({ type: 8, number: 4 } as Module)}
                </div>
            </div>  

            <div class="help-section">
                <div>${_("When a player deploys this type of Module, they immediately earn the number of research points indicated at the bottom right. In addition, for each adjacent module of the indicated color (green, orange, purple, and/or blue), they immediately earn the number of research points shown. If the player <strong>later</strong> deploys a Module of the indicated color adjacent to this one, they earn the number of research points shown.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 2, number: 9 } as Module)}
                    ${this.modulesManager.getHtml({ type: 2, number: 12 } as Module)}
                    ${this.modulesManager.getHtml({ type: 2, number: 11 } as Module)}
                    ${this.modulesManager.getHtml({ type: 2, number: 10 } as Module)}
                </div>
            </div>

            <h2>${_("Greenhouse Modules")}</h2>

            <div class="help-section">
                <div>${_("Greenhouses have special placement rules and allow the player to score points during the game (the size of the Greenhouse group after deploying the tile). There are 3 different types: round, rectangular, and octagonal.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 3, number: 12 } as Module)}
                    ${this.modulesManager.getHtml({ type: 3, number: 13 } as Module)}
                    ${this.modulesManager.getHtml({ type: 3, number: 14 } as Module)}
                </div>
            </div>  

            <div class="help-section">
                <div>${_("This special Greenhouse Module is a “wild” whose type is chosen by the player (round, rectangular, or octagonal). This choice may change depending on the Greenhouses that are placed around it. It also earns the player 1 victory point when it is deployed.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 3, number: 15 } as Module)}
                </div>
            </div>  

            <h2>${_("Drone Landing Strips")}</h2>

            <div class="help-section">
                <div>${_("These Modules earn the player 1 victory point when deployed. They count as a blue or orange Module, depending on their color, but cannot be activated.")}</div>
                <div class="tiles">
                    ${this.modulesManager.getHtml({ type: 3, number: 5 } as Module)}
                    ${this.modulesManager.getHtml({ type: 3, number: 2 } as Module)}
                </div>
            </div>            

            <h1>${_("Mission Tiles")}</h1>

            <h2>${_("Missions ${letter}").replace('${letter}', 'A')}</h2>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 4, adjacent: true, color: ORANGE } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, adjacent: true, color: BLUE } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, adjacent: true, color: PURPLE, diagonal: true } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 1, number: 1 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 1, number: 2 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 1, number: 3 } as Mission)}
                </div>

                <div>
                    ${_("Note: For these Missions, the layout of the Modules presented on the tiles is for information only — the player does not have to reproduce it exactly to complete the Mission.")}
                </div>
            </div>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 6, adjacent: false, color: ORANGE } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 4, adjacent: false, color: BLUE } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, adjacent: false, color: PURPLE } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 1, number: 4 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 1, number: 5 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 1, number: 6 } as Mission)}
                </div>
            </div>

            <h2>${_("Missions ${letter}").replace('${letter}', 'B')}</h2>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 4, direction: 1, sameColor: false } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 5, direction: 2, sameColor: false } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 4, direction: 3, sameColor: false } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 2, number: 1 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 2, number: 2 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 2, number: 3 } as Mission)}
                </div>
            </div>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 3, direction: 1, sameColor: true } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, direction: 2, sameColor: true } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, direction: 3, sameColor: true } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 2, number: 4 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 2, number: 5 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 2, number: 6 } as Mission)}
                </div>
            </div>

            <h2>${_("Missions ${letter}").replace('${letter}', 'C')}</h2>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 4, baseType: 1 } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 4, baseType: 2 } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 4, baseType: 3 } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 3, number: 1 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 3, number: 2 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 3, number: 3 } as Mission)}
                </div>
            </div>

            <div class="help-section">
                <div>${this.missionsManager.getTooltip({ minimum: 3, side: 1 } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, side: 2 } as Mission)}</div>
                <div>${this.missionsManager.getTooltip({ minimum: 3, side: 3 } as Mission)}</div>
                <div class="tiles">
                    ${this.missionsManager.getHtml({ type: 3, number: 4 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 3, number: 5 } as Mission)}
                    ${this.missionsManager.getHtml({ type: 3, number: 6 } as Mission)}
                </div>
            </div>
        `;

        return html;
    }
    
    public onTableExperimentClick(experiment: Experiment): void {
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            const args = this.gamedatas.gamestate.args as EnteringActivateModuleArgs;
            if (experiment.effect == 1 && !args.reactivatableAstronauts) {
                (this as any).confirmationDialog(_("There are no astronaut to reactivate."), () => this.chooseNewExperiment(experiment.id));
            } else {
                this.chooseNewExperiment(experiment.id);
            }
        }
    }

    public onPlayerModuleClick(card: Module): void {
        if (['activateModule', 'chooseAction'].includes(this.gamedatas.gamestate.name)) {
            const args = this.gamedatas.gamestate.args as EnteringActivateModuleArgs;
            if (!args.timeUnitUseful) {
                (this as any).confirmationDialog(_("There are no astronaut to move."), () => this.activateModule(card.id));
            } else {
                this.activateModule(card.id);
            }
        }
    }
    
    public onPlayerModuleSpotClick(x: number, y: number): void {
        if (this.gamedatas.gamestate.private_state?.name == 'moveAstronaut') {
            this.moveAstronaut(x, y);
        }
    }

    public onTableModuleClick(module: Module): void {
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            this.chooseNewModule(module.id);
        }
    }

    public onAstronautClick(astronaut: Astronaut): void {
        if (['chooseAction', 'chooseAstronaut'].includes(this.gamedatas.gamestate.name)) {
            this.chooseAstronaut(astronaut.id);
        } else if (this.gamedatas.gamestate.name == 'upgradeAstronaut') {
            this.upgradeAstronaut(astronaut.id);
        }
    }
  	
    public chooseAstronaut(id: number) {
        if(!(this as any).checkAction('chooseAstronaut')) {
            return;
        }

        this.takeAction('chooseAstronaut', {
            id
        });
    }
  	
    public upgradeAstronaut(id: number) {
        if(!(this as any).checkAction('upgradeAstronaut')) {
            return;
        }

        this.takeAction('upgradeAstronaut', {
            id
        });
    }
  	
    public activateModule(id: number) {
        if(!(this as any).checkAction('activateModule')) {
            return;
        }

        this.takeAction('activateModule', {
            id
        });
    }
  	
    public chooseNewModule(id: number) {
        if(!(this as any).checkAction('chooseNewModule')) {
            return;
        }

        this.takeAction('chooseNewModule', {
            id
        });
    }
  	
    public chooseCommunicationColor(color: number) {
        if(!(this as any).checkAction('chooseCommunicationColor')) {
            return;
        }

        this.takeAction('chooseCommunicationColor', {
            color
        });
    }
  	
    public chooseNewExperiment(id: number) {
        if(!(this as any).checkAction('chooseNewExperiment')) {
            return;
        }

        this.takeAction('chooseNewExperiment', {
            id
        });
    }
  	
    public pay(id: number, resource: number) {
        if(!(this as any).checkAction('pay')) {
            return;
        }

        this.takeAction('pay', {
            id, resource
        });
    }
  	
    public autoPay() {
        if(!(this as any).checkAction('autoPay')) {
            return;
        }

        this.takeAction('autoPay');
    }
  	
    public endTurn() {
        if(!(this as any).checkAction('endTurn')) {
            return;
        }

        this.takeAction('endTurn');
    }
  	
    public confirmTurn() {
        if(!(this as any).checkAction('confirmTurn')) {
            return;
        }

        this.takeAction('confirmTurn');
    }
  	
    public restartTurn() {
        this.takeAction('restartTurn');
    }
  	
    public moveAstronaut(x: number, y: number) {
        if(!(this as any).checkAction('moveAstronaut')) {
            return;
        }

        this.takeAction('moveAstronaut', {
            x: x + 1000,
            y: y + 1000,
        });
    }
  	
    public confirmMoveAstronauts() {
        if(!(this as any).checkAction('confirmMoveAstronauts')) {
            return;
        }

        this.takeAction('confirmMoveAstronauts');
    }
  	
    public cancelConfirmAstronaut() {
        this.takeAction('cancelConfirmAstronaut');
    }
  	
    public undoMoveAstronaut() {
        if(!(this as any).checkAction('undoMoveAstronaut')) {
            return;
        }

        this.takeAction('undoMoveAstronaut');
    }

    public takeAction(action: string, data?: any) {
        data = data || {};
        data.lock = true;
        (this as any).ajaxcall(`/humanity/humanity/${action}.html`, data, this, () => {});
    }

    ///////////////////////////////////////////////////
    //// Reaction to cometD notifications

    /*
        setupNotifications:

        In this method, you associate each of your game notifications with your local method to handle it.

        Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                your pylos.game.php file.

    */
    setupNotifications() {
        //log( 'notifications subscriptions setup' );

        const notifs = [
            ['firstPlayerToken', undefined],
            ['activateModule', ANIMATION_MS],
            ['pay', 50],
            ['removeModule', ANIMATION_MS],
            ['disableAstronaut', ANIMATION_MS],
            ['gainTimeUnit', ANIMATION_MS],
            ['moveAstronautToTable', ANIMATION_MS],
            ['deployModule', undefined],
            ['deployExperiment', undefined],
            ['researchPoints', 1],
            ['vp', 1],
            ['science', 1],
            ['newFirstPlayer', ANIMATION_MS],
            ['removeTableModule', ANIMATION_MS],
            ['shiftTableModule', ANIMATION_MS],
            ['newTableModule', ANIMATION_MS],
            ['moveArm', ANIMATION_MS],
            ['newTableExperiments', ANIMATION_MS],
            ['reactivateAstronauts', ANIMATION_MS],
            ['upgradeAstronaut', 50],
            ['addSquares', 1],
            ['year', 2000],
            ['gainMission', undefined],
            ['moveAstronaut', ANIMATION_MS],
            ['confirmMoveAstronauts', 1],
            ['restartTurn', 1],
            ['score', 1],
            ['endScore', SCORE_MS],
        ];
    
        notifs.forEach((notif) => {
            dojo.subscribe(notif[0], this, (notifDetails: Notif<any>) => {
                log(`notif_${notif[0]}`, notifDetails.args);

                const promise = this[`notif_${notif[0]}`](notifDetails.args);

                if (notifDetails.args.playerId && notifDetails.args.icons) {
                    this.updateIcons(notifDetails.args.playerId, notifDetails.args.icons);
                }

                // tell the UI notification ends, if the function returned a promise
                promise?.then(() => (this as any).notifqueue.onSynchronousNotificationEnd());
            });
            (this as any).notifqueue.setSynchronous(notif[0], notif[1]);
        });

        if (isDebug) {
            notifs.forEach((notif) => {
                if (!this[`notif_${notif[0]}`]) {
                    console.warn(`notif_${notif[0]} function is not declared, but listed in setupNotifications`);
                }
            });

            Object.getOwnPropertyNames(Humanity.prototype).filter(item => item.startsWith('notif_')).map(item => item.slice(6)).forEach(item => {
                if (!notifs.some(notif => notif[0] == item)) {
                    console.warn(`notif_${item} function is declared, but not listed in setupNotifications`);
                }
            });
        }
    }

    notif_firstPlayerToken(notif: Notif<NotifFirstPlayerTokenArgs>) {
        return this.placeFirstPlayerToken(notif.args.playerId);
    }

    notif_activateModule(args: NotifRotateModuleArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.rotateModule(args.module);
    }

    notif_pay(args: NotifRotateModuleArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.rotateModule(args.module);
    }

    notif_removeModule(args: NotifRemoveModuleArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.removeModule(args.module);
    }

    notif_disableAstronaut(args: NotifAstronautArgs) {
        this.astronautsManager.updateAstronaut(args.astronaut);
    }

    notif_gainTimeUnit(args: NotifGainTimeUnitArgs) {
        const { astronauts } = args;
        astronauts.forEach(astronaut => this.tableCenter.moveAstronaut(astronaut));
    }

    notif_moveAstronautToTable(args: NotifMoveAstronautToTableArgs) {
        const { astronaut } = args;
        this.astronautsManager.updateAstronaut(astronaut);
        this.tableCenter.moveAstronaut(astronaut);
    }

    notif_deployModule(args: NotifDeployModuleArgs) {
        const { playerId, module } = args;
        return this.getPlayerTable(playerId).addModule(module);
    }

    notif_addSquares(args: NotifAddSquaresArgs) {
        const { playerId, squares } = args;
        return this.getPlayerTable(playerId).addSquares(squares);
    }

    notif_deployExperiment(args: NotifDeployExperimentArgs) {
        const { playerId, experiment } = args;
        return this.getPlayerTable(playerId).addExperiment(experiment);
    }

    notif_endScore(args: NotifEndScoreArgs) {
        const {field, playerId, endScoreSummary} = args;
        document.getElementById(`score-${field}-${playerId}`).innerHTML = field == 'scienceByYear' ?
        `${endScoreSummary.scienceByYear.map((points, index) => `<div>${points} <span class="score-year">(${_('Year')} ${index + 1})</span></div>`).join('') ?? ''}</td>` : 
        `${endScoreSummary[field]}`;
    }

    notif_score(args: NotifScoreArgs) {
        this.setScore(args.playerId, args.new);
        this.setScience(args.playerId, Number(args.inc));
    }

    notif_researchPoints(args: NotifScoreArgs) {
        this.setResearchPoints(args.playerId, args.new);
    }

    notif_vp(args: NotifScoreArgs) {
        this.setVP(args.playerId, args.new);
    }

    notif_science(args: NotifScoreArgs) {
        if (!args.private || args.playerId == this.getPlayerId()) {
            this.setScience(args.playerId, args.new);
        }
    }

    notif_newFirstPlayer(args: NotifNewFirstPlayerArgs) {
        this.placeFirstPlayerToken(args.playerId);
    }

    notif_removeTableModule(args: NotifTableModuleArgs) {
        this.tableCenter.removeModule(args.module);
    }    

    notif_shiftTableModule(args: NotifTableModuleArgs) {
        this.tableCenter.shiftModule(args.module);
    }     

    notif_newTableModule(args: NotifNewTableModuleArgs) {
        const { module, year, moduleDeckCount, moduleDeckTopCard } = args;
        this.tableCenter.newModule(module);
        this.researchBoard.moduleDecks[year].setCardNumber(moduleDeckCount, moduleDeckTopCard);
        this.setProgress(args.year, args.inYearProgress);
    }  

    notif_moveArm(args: NotifMoveArmArgs) {
        this.tableCenter.moveArm(Number(args.diff));
    }   

    notif_newTableExperiments(args: NotifNewTableExperimentArgs) {
        this.tableCenter.newExperiments(args.tableExperiments, false);
    }   

    notif_reactivateAstronauts(args: NotifReactivateAstronautsArgs) {
        if (args.playerId) {
            this.getPlayerTable(args.playerId).reactivateAstronauts();
        } else {
            this.playersTables.forEach(playerTable => playerTable.reactivateAstronauts());
        }
    }

    notif_upgradeAstronaut(args: NotifAstronautArgs) {
        this.astronautsManager.updateAstronaut(args.astronaut);
    }

    notif_year(args: NotifYearArgs) {
        const year = +args.year;
        this.setProgress(year, args.inYearProgress);
        if (year != this.yearCounter.getValue()) {
            this.yearCounter.toValue(year);
            const label = document.querySelector('.year-text');
            label.classList.remove('animate');
            label.clientWidth;
            label.classList.add('animate');
        }
    }

    notif_gainMission(args: NotifGainMissionArgs) {
        const { playerId, mission, fromPlayerId } = args;
        if (fromPlayerId === null) {
            document.getElementById(`mission-science-token-${mission.id}`)?.remove();
        }
        return this.getPlayerTable(playerId).addMission(mission);
    }
    

    notif_restartTurn(args: NotifRestartTurnArgs) {
        const { playerId, undo } = args;

        const originalInstantaneousMode = (this as any).instantaneousMode;
        (this as any).instantaneousMode = true;

        this.tableCenter.resetModules(undo.tableModules);
        this.tableCenter.newExperiments(undo.tableExperiments, true);
        this.researchBoard.resetMissions(undo.allMissions.filter(mission => mission.location == 'table'));

        this.playersTables.forEach(playerTable => playerTable.resetMissions(undo.allMissions.filter(mission => mission.location == 'player' && mission.locationArg == playerTable.playerId)));

        const playerTable = this.getPlayerTable(playerId);
        playerTable.resetModules(undo.modules);
        //playerTable.resetExperiments(undo.experiments); // useless as table reset will remove
        playerTable.resetSquares(undo.squares);

        undo.astronauts.forEach(astronaut => this.astronautsManager.resetAstronaut(astronaut));

        this.setResearchPoints(playerId, undo.researchPoints);
        this.setVP(playerId, undo.vp);
        if (args.playerId == this.getPlayerId()) {
            this.setScience(playerId, undo.science);
        }

        (this as any).instantaneousMode = originalInstantaneousMode;
    }

    notif_moveAstronaut(args: NotifMoveAstronautArgs) {
        const { astronaut, toConfirm } = args;
        astronaut.location = astronaut.x !== null ? 'player' : 'table';

        this.astronautsManager.moveAstronautDiv(astronaut);
        this.astronautsManager.setAstronautToConfirm(astronaut, toConfirm);
    }

    notif_confirmMoveAstronauts(args: NotifConfirmMoveAstronautsArgs) {
        const { astronauts } = args;
        astronauts.forEach(astronaut => {
            this.astronautsManager.moveAstronautDiv(astronaut);
            this.astronautsManager.setAstronautToConfirm(astronaut, false)
        });
    }

    public getColor(color: number, blueOrOrange: boolean): string {
        switch (color) {
            case 0: return blueOrOrange ? _("Blue or orange") : _("Any color");
            case ORANGE: return _("Orange");
            case BLUE: return _("Blue");
            case PURPLE: return _("Purple");
            case GREEN: return _("Green");
        }
    }

    public getPower(power: number, timeUnits: number): string {
        switch (power) {
            case 1: return _("All Astronauts in the player’s Base are immediately reactivated: They are turned around to face the player and can be used again to perform an action starting <strong>from their next turn</strong>. If the player has no Astronauts to reactivate, the effect is lost.");
            case 2: return _("The player <strong>immediately</strong> gains ${number} Time unit(s): <strong>All their Astronauts</strong> around the main board are moved ${number} hangar(s) counterclockwise (including the one who just carried out this Experiment). Astronauts cannot be moved beyond the articulated arm.").replace(/\$\{number\}/g, timeUnits);
        }
    }

    public getSide(side: number): string {
        switch (side) {
            case 1: return _("left side");
            case 2: return _("center");
            case 3: return _("right side");
        }
    }

    public getResourceTooltip(color: number): string {
        switch (color) {
            case 0: return _("Electricity");
            case 1: return _("Ice");
            case 2: return _("Methane");
            case 3: return _("Insect");
            case 11: return _("Oxygen");
            case 12: return _("Aircarbon");
            case 13: return _("Protein");
        }
    }

    /* This enable to inject translatable styled things to logs or action bar */
    /* @Override */
    public format_string_recursive(log: string, args: any) {
        try {
            if (log && args && !args.processed) {
                ['cost', 'types'].forEach(argName => {
                    if (args[argName] && (typeof args[argName] !== 'string' || args[argName][0] !== '<')) {
                        args[argName] = getCostStr(args[argName]);
                    }
                });

                if (args.module_image === '' && args.module) {
                    args.module_image = `<div class="log-image">${this.modulesManager.getHtml(args.module)}</div>`;
                }

                if (args.experiment_image === '' && args.experiment) {
                    args.experiment_image = `<div class="log-image">${this.experimentsManager.getHtml(args.experiment)}</div>`;
                }

                if (args.mission_image === '' && args.mission) {
                    args.mission_image = `<div class="log-image">${this.missionsManager.getHtml(args.mission)}</div>`;
                }

                /* TODO DELETE ? for (const property in args) {
                    if (['number', 'color', 'card_color', 'card_type', 'mission_name'].includes(property) && args[property][0] != '<') {
                        args[property] = `<strong>${_(args[property])}</strong>`;
                    }
                }*/
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return (this as any).inherited(arguments);
    }
}