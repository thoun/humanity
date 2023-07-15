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

const ICONS_COUNTERS_TYPES = [1, 2, 3, 0];


function getCostStr(cost: Icons) {
    return Object.entries(cost).filter(entry => entry[1] > 0).map(entry => `${entry[1]} <div class="resource-icon" data-type="${entry[0]}"></div>`).join(' ');
}

class Humanity implements HumanityGame {
    public tilesManager: TilesManager;
    public researchManager: DestinationsManager;
    public objectivesManager: ObjectivesManager;

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

        this.tilesManager = new TilesManager(this);
        this.researchManager = new DestinationsManager(this);        
        this.objectivesManager = new ObjectivesManager(this);
        this.animationManager = new AnimationManager(this);
        new JumpToManager(this, {
            localStorageFoldedKey: LOCAL_STORAGE_JUMP_TO_FOLDED_KEY,
            topEntries: [
                new JumpToEntry(_('Main board TODO rename'), 'board-1', { 'color': '#224757' }),
                new JumpToEntry(_('Research board TODO rename'), 'research-board', { 'color': '#224757' }),
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

        new HelpManager(this, { 
            buttons: [
                new BgaHelpPopinButton({
                    title: _("Card help").toUpperCase(),
                    html: this.getHelpHtml(),
                    onPopinCreated: () => this.populateHelp(),
                    buttonBackground: '#653771',
                }),
            ]
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
            case 'activateTile':
                this.onEnteringActivateTile(args.args);
                break;
            case 'chooseWorker':
                this.onEnteringChooseWorker(args.args);
                break;
            case 'upgradeWorker':
                this.onEnteringUpgradeWorker(args.args);
                break;
            case 'moveWorker':
                this.onEnteringMoveWorker(args.args);
                break;
        }
    }

    private onEnteringChooseAction(args: EnteringChooseActionArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setSelectableWorkers(args.workers);
            this.tableCenter.setSelectableTiles(args.selectableTiles);
            this.tableCenter.setSelectableResearch(args.selectableResearch);
        }
    }
    
    public onEnteringActivateTile(args: EnteringActivateTileArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectedWorker(args.worker);
            table.setSelectableTiles(args.activatableTiles);
        }
    }

    private onEnteringChooseWorker(args: EnteringChooseWorkerArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setSelectableWorkers(args.workers);
        }
    }

    private onEnteringUpgradeWorker(args: EnteringChooseWorkerArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            args.workers.forEach(worker => document.getElementById(`worker-${worker.id}`).classList.add('selectable'));
        }
    }

    private onEnteringMoveWorker(args: EnteringMoveWorkerArgs) {
        this.getCurrentPlayerTable()?.setSelectableTileSpots(args.possibleCoordinates);
    }

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        switch (stateName) {
            case 'chooseAction':
                this.onLeavingChooseWorker();
                this.tableCenter.setSelectableTiles(null);
                this.tableCenter.setSelectableResearch(null);
                break;
            case 'activateTile':
                this.onLeavingActivateTile();
                break;
            case 'chooseWorker':
                this.onLeavingChooseWorker();
                break;
            case 'moveWorker':
                this.onLeavingMoveWorker();
                break;
            case 'upgradeWorker':
                this.onLeavingUpgradeWorker();
                break;
        }
    }
    
    public onLeavingActivateTile() {
        if ((this as any).isCurrentPlayerActive()) {
            const table = this.getCurrentPlayerTable();
            table.setSelectedWorker(null);
            table.setSelectableTiles(null);
        }
    }

    private onLeavingChooseWorker() {
        this.getCurrentPlayerTable()?.setSelectableWorkers([]);
    }

    private onLeavingMoveWorker() {
        this.getCurrentPlayerTable()?.setSelectableTileSpots(null);
    }

    private onLeavingUpgradeWorker() {
        document.querySelectorAll('.worker.selectable').forEach(worker => worker.classList.remove('selectable'));
    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'activateTile':
                    (this as any).addActionButton(`endTurn_button`, _("End turn"), () => this.endTurn());
                    break;
                case 'chooseRadarColor':
                    (this as any).addActionButton(`blue_button`, _("Blue"), () => this.chooseRadarColor(2));
                    (this as any).addActionButton(`orange_button`, _("Orange"), () => this.chooseRadarColor(1));
                    break;
                case 'pay':
                    (this as any).addActionButton(`autoPay_button`, _("Pay ${cost}").replace('${cost}', getCostStr(args.pay)), () => this.autoPay());
                    break;
                case 'confirmTurn':
                    (this as any).addActionButton(`confirmTurn_button`, _("Confirm turn"), () => this.confirmTurn());
                    break;
                case 'confirmMoveWorkers':
                    (this as any).addActionButton(`confirmMoveWorkers_button`, _("Confirm"), () => this.confirmMoveWorkers());
                    break;
            }

            
            if (['chooseRadarColor', 'pay', 'chooseWorker', 'upgradeWorker', 'activateTile', 'confirmTurn'].includes(stateName)) {
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
                ${type == 0 ? '' : `<div class="resource-icon" data-type="${type + 10}"></div>
                    <span id="type-${type + 10}-counter-${player.id}"></span>`}
                </div>
            `).join('');
            html += `</div>`;

            dojo.place(html, `player_board_${player.id}`);

            this.vpCounters[playerId] = new ebg.counter();
            this.vpCounters[playerId].create(`vp-counter-${playerId}`);
            this.vpCounters[playerId].setValue(player.vp);

            this.scienceCounters[playerId] = new ebg.counter();
            this.scienceCounters[playerId].create(`science-counter-${playerId}`);
            if (gamedatas.isEnd || playerId == this.getPlayerId()) {
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
    }

    private updateIcons(playerId: number, icons: Icons) {
        ICONS_COUNTERS_TYPES.forEach(type => { 
            this.iconsCounters[playerId][type].toValue(icons[type]);
    
            if (type != 0) {
                this.iconsCounters[playerId][type + 10].toValue(icons[type + 10]);
            }
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

    public createWorker(worker: Worker): HTMLDivElement {
        const workerDiv = document.createElement('div');
        workerDiv.id = `worker-${worker.id}`;
        workerDiv.classList.add('worker');
        workerDiv.dataset.id = `${worker.id}`;
        workerDiv.dataset.playerColor = this.getPlayer(worker.playerId).color;

        workerDiv.addEventListener('click', () => {
            if (workerDiv.classList.contains('selectable')) {
                this.onWorkerClick(worker);
            }
        });
        
        const workforceDiv = document.createElement('div');
        workforceDiv.id = `${workerDiv.id}-force`;
        workforceDiv.classList.add('workforce');
        workforceDiv.dataset.workforce = `${worker.workforce}`;
        workerDiv.appendChild(workforceDiv);

        return workerDiv;
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
        this.scienceCounters[playerId].toValue(count);
    }

    private setResearchPoints(playerId: number, count: number) {
        this.researchBoard.setResearchPoints(playerId, count);
    }

    private getHelpHtml() {
        let html = `
        <div id="help-popin">
            <h1>${_("Assets")}</h2>
            <div class="help-section">
                <div class="icon vp"></div>
                <div class="help-label">${_("Gain 1 <strong>Victory Point</strong>. The player moves their token forward 1 space on the Score Track.")}</div>
            </div>
            <div class="help-section">
                <div class="icon recruit"></div>
                <div class="help-label">${_("Gain 1 <strong>Recruit</strong>: The player adds 1 Recruit token to their ship.")} ${_("It is not possible to have more than 3.")} ${_("A recruit allows a player to draw the Viking card of their choice when Recruiting or replaces a Viking card during Exploration.")}</div>
            </div>
            <div class="help-section">
                <div class="icon bracelet"></div>
                <div class="help-label">${_("Gain 1 <strong>Silver Bracelet</strong>: The player adds 1 Silver Bracelet token to their ship.")} ${_("It is not possible to have more than 3.")} ${_("They are used for Trading.")}</div>
            </div>
            <div class="help-section">
                <div class="icon research"></div>
                <div class="help-label">${_("Gain 1 <strong>Research Point</strong>: The player moves their token forward 1 space on the Research Track.")}</div>
            </div>
            <div class="help-section">
                <div class="icon take-card"></div>
                <div class="help-label">${_("Draw <strong>the first Viking card</strong> from the deck: It is placed in the player’s Crew Zone (without taking any assets).")}</div>
            </div>

            <h1>${_("Powers of the objectives (variant option)")}</h1>
        `;

        for (let i = 1; i <=7; i++) {
            html += `
            <div class="help-section">
                <div id="help-objective-${i}"></div>
                <div>${this.objectivesManager.getTooltip(i)}</div>
            </div> `;
        }
        html += `</div>`;

        return html;
    }

    private populateHelp() {
        for (let i = 1; i <=7; i++) {
            this.objectivesManager.setForHelp(i, `help-objective-${i}`);
        }
    }
    
    public onTableResearchClick(research: Research): void {
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            this.chooseNewResearch(research.id);
        }
    }

    public onPlayerTileClick(card: Tile): void {
        this.activateTile(card.id);
    }
    
    public onPlayerTileSpotClick(x: number, y: number): void {
        if (this.gamedatas.gamestate.private_state?.name == 'moveWorker') {
            this.moveWorker(x, y);
        }
    }

    public onTableTileClick(tile: Tile): void {
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            this.chooseNewTile(tile.id);
        }
    }

    public onWorkerClick(worker: Worker): void {
        if (['chooseAction', 'chooseWorker'].includes(this.gamedatas.gamestate.name)) {
            this.chooseWorker(worker.id);
        } else if (this.gamedatas.gamestate.name == 'upgradeWorker') {
            this.upgradeWorker(worker.id);
        }
    }
  	
    public chooseWorker(id: number) {
        if(!(this as any).checkAction('chooseWorker')) {
            return;
        }

        this.takeAction('chooseWorker', {
            id
        });
    }
  	
    public upgradeWorker(id: number) {
        if(!(this as any).checkAction('upgradeWorker')) {
            return;
        }

        this.takeAction('upgradeWorker', {
            id
        });
    }
  	
    public activateTile(id: number) {
        if(!(this as any).checkAction('activateTile')) {
            return;
        }

        this.takeAction('activateTile', {
            id
        });
    }
  	
    public chooseNewTile(id: number) {
        if(!(this as any).checkAction('chooseNewTile')) {
            return;
        }

        this.takeAction('chooseNewTile', {
            id
        });
    }
  	
    public chooseRadarColor(color: number) {
        if(!(this as any).checkAction('chooseRadarColor')) {
            return;
        }

        this.takeAction('chooseRadarColor', {
            color
        });
    }
  	
    public chooseNewResearch(id: number) {
        if(!(this as any).checkAction('chooseNewResearch')) {
            return;
        }

        this.takeAction('chooseNewResearch', {
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
  	
    public moveWorker(x: number, y: number) {
        if(!(this as any).checkAction('moveWorker')) {
            return;
        }

        this.takeAction('moveWorker', {
            x: x + 1000,
            y: y + 1000,
        });
    }
  	
    public confirmMoveWorkers() {
        if(!(this as any).checkAction('confirmMoveWorkers')) {
            return;
        }

        this.takeAction('confirmMoveWorkers');
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
            ['activateTile', ANIMATION_MS],
            ['pay', 50],
            ['removeTile', ANIMATION_MS],
            ['disableWorker', ANIMATION_MS],
            ['gainTimeUnit', ANIMATION_MS],
            ['moveWorkerToTable', ANIMATION_MS],
            ['deployTile', undefined],
            ['deployResearch', undefined],
            ['score', 1],
            ['researchPoints', 1],
            ['vp', 1],
            ['science', 1],
            ['newFirstPlayer', ANIMATION_MS],
            ['removeTableTile', ANIMATION_MS],
            ['shiftTableTile', ANIMATION_MS],
            ['newTableTile', ANIMATION_MS],
            ['moveArm', ANIMATION_MS],
            ['newTableResearch', ANIMATION_MS],
            ['reactivateWorkers', ANIMATION_MS],
            ['upgradeWorker', 50],
            ['year', ANIMATION_MS],
            ['gainObjective', undefined],
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

    notif_activateTile(args: NotifRotateTileArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.rotateTile(args.tile);
    }

    notif_pay(args: NotifRotateTileArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.rotateTile(args.tile);
    }

    notif_removeTile(args: NotifRemoveTileArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.removeTile(args.tile);
    }

    notif_disableWorker(args: NotifWorkerArgs) {
        this.setWorkerDisabled(args.worker, true);
    }

    notif_gainTimeUnit(args: NotifGainTimeUnitArgs) {
        const { workers } = args;
        workers.forEach(worker => this.tableCenter.moveWorker(worker));
    }

    notif_moveWorkerToTable(args: NotifMoveWorkerToTableArgs) {
        const { worker } = args;
        this.setWorkerDisabled(worker, false);
        this.tableCenter.moveWorker(worker);
    }

    notif_deployTile(args: NotifDeployTileArgs) {
        const { playerId, tile } = args;
        return this.getPlayerTable(playerId).addTile(tile);
    }

    notif_deployResearch(args: NotifDeployResearchArgs) {
        const { playerId, research } = args;
        return this.getPlayerTable(playerId).addResearch(research);
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

    notif_removeTableTile(args: NotifTableTileArgs) {
        this.tableCenter.removeTile(args.tile);
    }    

    notif_shiftTableTile(args: NotifTableTileArgs) {
        this.tableCenter.shiftTile(args.tile);
    }     

    notif_newTableTile(args: NotifTableTileArgs) {
        this.tableCenter.newTile(args.tile);
    }  

    notif_moveArm(args: NotifMoveArmArgs) {
        this.tableCenter.moveArm(args.arm);
    }   

    notif_newTableResearch(args: NotifNewTableResearchArgs) {
        this.tableCenter.newResearch(args.tableResearch);
    }   

    notif_reactivateWorkers(args: NotifReactivateWorkersArgs) {
        if (args.playerId) {
            this.getPlayerTable(args.playerId).reactivateWorkers();
        } else {
            this.playersTables.forEach(playerTable => playerTable.reactivateWorkers());
        }
    }

    notif_upgradeWorker(args: NotifWorkerArgs) {
        document.getElementById(`worker-${args.worker.id}-force`).dataset.workforce = `${args.worker.workforce}`;
    }

    notif_year(args: NotifYearArgs) {
        this.yearCounter.toValue(+args.year);
    }

    notif_gainObjective(args: NotifGainObjectiveArgs) {
        const { playerId, objective, fromPlayerId } = args;
        if (fromPlayerId === null) {
            document.getElementById(`objective-science-token-${objective.id}`)?.remove();
        }
        return this.getPlayerTable(playerId).addObjective(objective);
    }
    

    notif_restartTurn(args: NotifRestartTurnArgs) {
        const { playerId, undo } = args;

        this.tableCenter.resetTiles(undo.tableTiles);
        this.tableCenter.newResearch(undo.tableResearch);
        this.researchBoard.resetObjectives(undo.allObjectives.filter(objective => objective.location == 'table'));

        this.playersTables.forEach(playerTable => playerTable.resetObjectives(undo.allObjectives.filter(objective => objective.location == 'player' && objective.locationArg == playerTable.playerId)));

        const table = this.getPlayerTable(playerId);
        table.resetTiles(undo.tiles);
        table.resetResearch(undo.research);

        undo.workers.forEach(worker => this.resetWorker(playerId, worker));

        this.setResearchPoints(playerId, undo.researchPoints);
        this.setVP(playerId, undo.vp);
        if (args.playerId == this.getPlayerId()) {
            this.setScience(playerId, undo.science);
        }
    }

    private resetWorker(playerId: number, worker: Worker) {
        const workerDiv = document.getElementById(`worker-${worker.id}`);
        if (worker.location == 'player') {
            const tilesDiv = document.getElementById(`player-table-${playerId}-tiles`);
            tilesDiv.querySelector(`[data-slot-id="${worker.x}_${worker.y}"]`).appendChild(workerDiv);
        } else if (worker.location == 'table') {
            const tableWorkers = document.getElementById('table-workers');
            tableWorkers.querySelector(`.slot[data-slot-id="${worker.spot}"]`).appendChild(workerDiv);
        }
        workerDiv.classList.toggle('disabled-worker', !worker.remainingWorkforce);
        document.getElementById(`worker-${worker.id}-force`).dataset.workforce = `${worker.workforce}`;
    }

    private setWorkerDisabled(worker: Worker, disabled: boolean) {
        document.getElementById(`worker-${worker.id}`).classList.toggle('disabled-worker', disabled);
    }

    public getColor(color: number, blueOrOrange: boolean): string {
        switch (color) {
            case 0: return blueOrOrange ? _("Blue or orange") : _("Any color");
            case 1: return _("Orange");
            case 2: return _("Blue");
            case 3: return _("Purple");
            case 4: return _("Green");
        }
    }

    public getResourceTooltip(color: number): string {
        switch (color) {
            case 0: return _("Electricity");
            case 1: return _("Ice");
            case 2: return _("Methan");
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

                if (args.tile_image === '' && args.tile) {
                    args.tile_image = `<div class="log-image">${this.tilesManager.getHtml(args.tile)}</div>`;
                }

                if (args.research_image === '' && args.research) {
                    args.research_image = `<div class="log-image">${this.researchManager.getHtml(args.research)}</div>`;
                }

                if (args.objective_image === '' && args.objective) {
                    args.objective_image = `<div class="log-image">${this.objectivesManager.getHtml(args.objective)}</div>`;
                }

                /* TODO DELETE ? for (const property in args) {
                    if (['number', 'color', 'card_color', 'card_type', 'objective_name'].includes(property) && args[property][0] != '<') {
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