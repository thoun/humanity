declare const define;
declare const ebg;
declare const $;
declare const dojo: Dojo;
declare const _;
declare const g_gamethemeurl;

const ANIMATION_MS = 500;
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

        this.modulesManager = new ModulesManager(this);
        this.experimentsManager = new ExperimentsManager(this);        
        this.missionsManager = new MissionsManager(this);
        this.animationManager = new AnimationManager(this);
        new JumpToManager(this, {
            localStorageFoldedKey: LOCAL_STORAGE_JUMP_TO_FOLDED_KEY,
            topEntries: [
                new JumpToEntry(_('AMBS'), 'board-1', { 'color': '#224757' }),
                new JumpToEntry(_('Research track'), 'research-board', { 'color': '#224757' }),
            ],
            entryClasses: 'hexa-point',
            defaultFolded: false,
        });

        this.tableCenter = new TableCenter(this, gamedatas);
        this.researchBoard = new ResearchBoard(this, gamedatas);
        this.createPlayerPanels(gamedatas);
        this.createPlayerTables(gamedatas);      

        document.getElementById(`year`).insertAdjacentText('beforebegin', _('Year') + ' ');
        this.yearCounter = new ebg.counter();
        this.yearCounter.create(`year`);
        this.yearCounter.setValue(gamedatas.year);

        gamedatas.movedAstronauts?.forEach(astronaut => {
            if (astronaut.location == 'table' && astronaut.x !== null) {
                astronaut.location = 'player';
                this.moveAstronautDiv(astronaut.playerId, astronaut);
                this.setAstronautToConfirm(astronaut, true);
            }
        })
        
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

        log( "Ending game setup" );
    }

    ///////////////////////////////////////////////////
    //// Game & client states

    // onEnteringState: this method is called each time we are entering into a new game state.
    //                  You can use this method to perform some user interface changes at this moment.
    //
    public onEnteringState(stateName: string, args: any) {
        log('Entering state: ' + stateName, args.args);

        switch (stateName) {
            case 'chooseAction':
                this.onEnteringChooseAction(args.args);
                break;
            case 'activateModule':
                this.onEnteringActivateModule(args.args);
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
        }
    }

    private onEnteringChooseAction(args: EnteringChooseActionArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setSelectableAstronauts(args.astronauts);
            this.tableCenter.setSelectableModules(args.selectableModules);
            this.tableCenter.setSelectableExperiments(args.selectableExperiments);
        }
    }
    
    public onEnteringActivateModule(args: EnteringActivateModuleArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectedAstronaut(args.astronaut);
            table.setSelectableModules(args.activatableModules);
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

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        switch (stateName) {
            case 'chooseAction':
                this.onLeavingChooseAstronaut();
                this.tableCenter.setSelectableModules(null);
                this.tableCenter.setSelectableExperiments(null);
                break;
            case 'activateModule':
                this.onLeavingActivateModule();
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
    
    public onLeavingActivateModule() {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectedAstronaut(null);
            table.setSelectableModules(null);
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
                    (this as any).addActionButton(`autoPay_button`, _("Spend ${cost}").replace('${cost}', getCostStr(args.pay)), () => this.autoPay());
                    break;
                case 'confirmTurn':
                    (this as any).addActionButton(`confirmTurn_button`, _("Confirm turn"), () => this.confirmTurn());
                    break;
                case 'confirmMoveAstronauts':
                    (this as any).addActionButton(`confirmMoveAstronauts_button`, _("Confirm"), () => this.confirmMoveAstronauts());
                    (this as any).addActionButton(`restartMoveAstronauts_button`, _("Restart"), () => this.restartMoveAstronauts(), null, null, 'red');
                    break;
            }

            
            if (['chooseCommunicationColor', 'pay', 'chooseAstronaut', 'upgradeAstronaut', 'activateModule', 'confirmTurn'].includes(stateName)) {
                (this as any).addActionButton(`restartTurn_button`, _("Restart turn"), () => this.restartTurn(), null, null, 'red');
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

    private getPlayerTable(playerId: number): PlayerTable {
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
            
            <div class="icons counters">`;
            
            html += ICONS_COUNTERS_TYPES.map(type => `
                <div id="type-${type}-counter-wrapper-${player.id}">
                    <div class="resource-icon" data-type="${type}"></div>
                    <span id="type-${type}-counter-${player.id}"></span>
                </div>
            `).join('');
            html += `</div>
            <div class="icons counters">`;            
            html += ICONS_COUNTERS_TYPES.map(type => `
                <div id="type-${type + 10}-counter-wrapper-${player.id}">
                ${type == 0 ? `<i id="counter-warning-${player.id}" class="counter-warning fa fa-exclamation-triangle" aria-hidden="true" data-warning="${player.icons[-1]}"></i>` : `<div class="resource-icon" data-type="${type + 10}"></div>
                    <span id="type-${type + 10}-counter-${player.id}"></span>`}
                </div>
            `).join('');
            html += `</div>`;

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
            ICONS_COUNTERS_TYPES.forEach(type => {
                this.iconsCounters[playerId][type] = new ebg.counter();
                this.iconsCounters[playerId][type].create(`type-${type}-counter-${playerId}`);
                this.iconsCounters[playerId][type].setValue(player.icons[type]);
                this.setTooltip(`type-${type}-counter-wrapper-${player.id}`, this.getResourceTooltip(type));

                if (type != 0) {
                    this.iconsCounters[playerId][type + 10] = new ebg.counter();
                    this.iconsCounters[playerId][type + 10].create(`type-${type + 10}-counter-${playerId}`);
                    this.iconsCounters[playerId][type + 10].setValue(player.icons[type + 10]);
                    this.setTooltip(`type-${type + 10}-counter-wrapper-${player.id}`, this.getResourceTooltip(type + 10));
                }
            });

            // first player token
            dojo.place(`<div id="player_board_${player.id}_firstPlayerWrapper" class="firstPlayerWrapper"></div>`, `player_board_${player.id}`);

            if (gamedatas.firstPlayerId === playerId) {
                this.placeFirstPlayerToken(gamedatas.firstPlayerId);
            }
        });

        this.setTooltipToClass('vp-counter', _('Victory points'));
        this.setTooltipToClass('science-counter', _('Science points'));
        this.setTooltipToClass('counter-warning', `${_('The counters display all possible resources.')}<br>${_('Some of your modules allow to choose between two types of resources, so when you will activate them, <strong>it will lower the counter for both resources</strong>!')}`);
    }

    private updateIcons(playerId: number, icons: Icons) {
        ICONS_COUNTERS_TYPES.forEach(type => { 
            this.iconsCounters[playerId][type].toValue(icons[type]);
    
            if (type != 0) {
                this.iconsCounters[playerId][type + 10].toValue(icons[type + 10]);
            }
        });

        document.getElementById(`counter-warning-${playerId}`).dataset.warning = `${icons[-1]}`;
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

    public createAstronaut(astronaut: Astronaut): HTMLDivElement {
        const astronautDiv = document.createElement('div');
        astronautDiv.id = `astronaut-${astronaut.id}`;
        astronautDiv.classList.add('astronaut');
        astronautDiv.dataset.id = `${astronaut.id}`;
        astronautDiv.dataset.playerColor = this.getPlayer(astronaut.playerId).color;

        astronautDiv.addEventListener('click', () => {
            if (astronautDiv.classList.contains('selectable')) {
                this.onAstronautClick(astronaut);
            }
        });
        
        const workforceDiv = document.createElement('div');
        workforceDiv.id = `${astronautDiv.id}-force`;
        workforceDiv.classList.add('workforce');
        workforceDiv.dataset.workforce = `${astronaut.workforce}`;
        astronautDiv.appendChild(workforceDiv);

        return astronautDiv;
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
                        <div class="legend-number" style="left: 10px; top: 20px;">1</div>
                        <div class="legend-number" style="left: 40px; top: 20px;">2</div>
                        <div class="legend-number" style="left: 70px; top: 20px;">3</div>
                        <div class="legend-number" style="left: 100px; top: 20px;">4</div>
                    </div>
                </div>

                <h2>[TODO Reactivate logo]</h2>
                <div>${this.getPower(1, 2)}</div>
                <h2>[TODO Time unit logo]</h2>
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
            TODO

            <h2>${_("Modules that Earn Research Points")}</h2>
            TODO

            <h2>${_("Greenhouse Modules")}</h2>
            TODO

            <h2>${_("Drone Landing Strips")}</h2>
            TODO

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
            this.chooseNewExperiment(experiment.id);
        }
    }

    public onPlayerModuleClick(card: Module): void {
        this.activateModule(card.id);
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
  	
    public restartMoveAstronauts() {
        if(!(this as any).checkAction('restartMoveAstronauts')) {
            return;
        }

        this.takeAction('restartMoveAstronauts');
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
            ['score', 1],
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
            ['year', ANIMATION_MS],
            ['gainMission', undefined],
            ['moveAstronaut', ANIMATION_MS],
            ['confirmMoveAstronauts', 1],
            ['restartTurn', 1],
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
        this.setAstronautDisabled(args.astronaut, true);
    }

    notif_gainTimeUnit(args: NotifGainTimeUnitArgs) {
        const { astronauts } = args;
        astronauts.forEach(astronaut => this.tableCenter.moveAstronaut(astronaut));
    }

    notif_moveAstronautToTable(args: NotifMoveAstronautToTableArgs) {
        const { astronaut } = args;
        this.setAstronautDisabled(astronaut, false);
        this.tableCenter.moveAstronaut(astronaut);
    }

    notif_deployModule(args: NotifDeployModuleArgs) {
        const { playerId, module } = args;
        return this.getPlayerTable(playerId).addModule(module);
    }

    notif_deployExperiment(args: NotifDeployExperimentArgs) {
        const { playerId, experiment } = args;
        return this.getPlayerTable(playerId).addExperiment(experiment);
    }

    notif_score(args: NotifScoreArgs) {
        this.setScore(args.playerId, args.new);
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

    notif_newTableModule(args: NotifTableModuleArgs) {
        this.tableCenter.newModule(args.module);
    }  

    notif_moveArm(args: NotifMoveArmArgs) {
        this.tableCenter.moveArm(args.arm);
    }   

    notif_newTableExperiments(args: NotifNewTableExperimentArgs) {
        this.tableCenter.newExperiments(args.tableExperiments);
    }   

    notif_reactivateAstronauts(args: NotifReactivateAstronautsArgs) {
        if (args.playerId) {
            this.getPlayerTable(args.playerId).reactivateAstronauts();
        } else {
            this.playersTables.forEach(playerTable => playerTable.reactivateAstronauts());
        }
    }

    notif_upgradeAstronaut(args: NotifAstronautArgs) {
        document.getElementById(`astronaut-${args.astronaut.id}-force`).dataset.workforce = `${args.astronaut.workforce}`;
    }

    notif_year(args: NotifYearArgs) {
        this.yearCounter.toValue(+args.year);
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

        this.tableCenter.resetModules(undo.tableModules);
        this.tableCenter.newExperiments(undo.tableExperiments);
        this.researchBoard.resetMissions(undo.allMissions.filter(mission => mission.location == 'table'));

        this.playersTables.forEach(playerTable => playerTable.resetMissions(undo.allMissions.filter(mission => mission.location == 'player' && mission.locationArg == playerTable.playerId)));

        const table = this.getPlayerTable(playerId);
        table.resetModules(undo.modules);
        table.resetExperiments(undo.experiments);

        undo.astronauts.forEach(astronaut => this.resetAstronaut(playerId, astronaut));

        this.setResearchPoints(playerId, undo.researchPoints);
        this.setVP(playerId, undo.vp);
        if (args.playerId == this.getPlayerId()) {
            this.setScience(playerId, undo.science);
        }
    }

    notif_moveAstronaut(args: NotifMoveAstronautArgs) {
        const { playerId, astronaut, toConfirm } = args;
        astronaut.location = astronaut.x !== null ? 'player' : 'table';
        this.moveAstronautDiv(playerId, astronaut);
        this.setAstronautToConfirm(astronaut, toConfirm);
    }

    notif_confirmMoveAstronauts(args: NotifConfirmMoveAstronautsArgs) {
        const { astronauts } = args;
        astronauts.forEach(astronaut => this.setAstronautToConfirm(astronaut, false));
    }

    private moveAstronautDiv(playerId: number, astronaut: Astronaut) {
        const astronautDiv = document.getElementById(`astronaut-${astronaut.id}`);
        if (astronaut.location == 'player') {
            const modulesDiv = document.getElementById(`player-table-${playerId}-modules`);
            this.getPlayerTable(playerId).makeSlotForCoordinates(astronaut.x, astronaut.y);
            modulesDiv.querySelector(`[data-slot-id="${astronaut.x}_${astronaut.y}"]`).appendChild(astronautDiv);
        } else if (astronaut.location == 'table') {
            const tableAstronauts = document.getElementById('table-astronauts');
            tableAstronauts.querySelector(`.slot[data-slot-id="${astronaut.spot}"]`).appendChild(astronautDiv);
        }
    }

    private resetAstronaut(playerId: number, astronaut: Astronaut) {
        this.moveAstronautDiv(playerId, astronaut);
        document.getElementById(`astronaut-${astronaut.id}`).classList.toggle('disabled-astronaut', !astronaut.remainingWorkforce);
        document.getElementById(`astronaut-${astronaut.id}-force`).dataset.workforce = `${astronaut.workforce}`;
    }

    private setAstronautDisabled(astronaut: Astronaut, disabled: boolean) {
        document.getElementById(`astronaut-${astronaut.id}`).classList.toggle('disabled-astronaut', disabled);
    }

    private setAstronautToConfirm(astronaut: Astronaut, toConfirm: boolean) {
        document.getElementById(`astronaut-${astronaut.id}`).classList.toggle('to-confirm', toConfirm);
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
            case 2: return _("The player <strong>immediately</strong> gains ${number} Time units: <strong>All their Astronauts</strong> around the main board are moved 2 hangars counterclockwise (including the one who just carried out this Experiment). Astronauts cannot be moved beyond the articulated arm.").replace('${number}', timeUnits);
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