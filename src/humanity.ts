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

const VP_BY_RESEARCH = {
    0: 0,
    3: 1,
    6: 2,
    10: 3,
    14: 5,
};

const EQUAL = -1;
const DIFFERENT = 0;

const VP = 1;
const BRACELET = 2;
const RECRUIT = 3;
const RESEARCH = 4;
const CARD = 5;

function getVpByResearch(research: number) {
    return Object.entries(VP_BY_RESEARCH).findLast(entry => research >= Number(entry[0]))[1];
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
    private researchCounters: Counter[] = [];
    private recruitCounters: Counter[] = [];
    private braceletCounters: Counter[] = [];
    
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
                new JumpToEntry(_('Main board TODO rename'), 'table-center', { 'color': '#224757' })
            ],
            entryClasses: 'hexa-point',
            defaultFolded: true,
        });

        this.tableCenter = new TableCenter(this, gamedatas);
        this.researchBoard = new ResearchBoard(this, gamedatas);
        this.createPlayerPanels(gamedatas);
        this.createPlayerTables(gamedatas);
        
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

        if (gamedatas.lastTurn) {
            this.notif_lastTurn(false);
        }

        new HelpManager(this, { 
            buttons: [
                new BgaHelpPopinButton({
                    title: _("Card help").toUpperCase(),
                    html: this.getHelpHtml(),
                    onPopinCreated: () => this.populateHelp(),
                    buttonBackground: '#5890a9',
                }),
                new BgaHelpExpandableButton({
                    unfoldedHtml: this.getColorAddHtml(),
                    foldedContentExtraClasses: 'color-help-folded-content',
                    unfoldedContentExtraClasses: 'color-help-unfolded-content',
                    expandedWidth: '150px',
                    expandedHeight: '210px',
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
            case 'chooseWorker':
                this.onEnteringChooseWorker(args.args);
                break;
        }
    }

    private onEnteringChooseWorker(args: EnteringChooseWorkerArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setSelectableWorkers(args.workers);
        }
    }

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        switch (stateName) {
            case 'chooseWorker':
                this.onLeavingChooseWorker();
                break;
        }
    }

    private onLeavingChooseWorker() {
        this.getCurrentPlayerTable()?.setSelectableWorkers([]);
    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'playAction':
                    const playActionArgs = args as EnteringChooseWorkerArgs;
                    
                    if (!playActionArgs.noActionYet) { // TODO
                        (this as any).addActionButton(`endTurn_button`, _("End turn"), () => this.endTurn());
                    }
                    break;
                case 'chooseNewCard':
                    const chooseNewCardArgs = args as EnteringChooseNewCardArgs;
                    [1, 2, 3, 4, 5].forEach(color => {
                        const free = chooseNewCardArgs.allFree || color == chooseNewCardArgs.freeColor;
                        (this as any).addActionButton(`chooseNewCard${color}_button`, _("Take ${color}").replace('${color}', `<div class="color" data-color="${color}"></div>`) + ` (${free ? _('free') : `1 <div class="recruit icon"></div>`})`, () => this.chooseNewCard(chooseNewCardArgs.centerCards.find(card => card.locationArg == color).id), null, null, free ? undefined : 'gray');
                        if (!free && chooseNewCardArgs.recruits < 1) {
                            document.getElementById(`chooseNewCard${color}_button`).classList.add('disabled');
                        }
                    });
                    break;
                case 'payDestination':
                    (this as any).addActionButton(`payDestination_button`, '', () => this.payDestination());
                    this.setPayDestinationLabelAndState(args);

                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
                    break;
                case 'trade':
                    const tradeArgs = args as EnteringTradeArgs;
                    [1, 2, 3].forEach(number => {
                        (this as any).addActionButton(`trade${number}_button`, _("Trade ${number} bracelet(s)").replace('${number}', number), () => this.trade(number, tradeArgs.gainsByBracelets));
                        const button = document.getElementById(`trade${number}_button`);
                        if (tradeArgs.bracelets < number) {
                            button.classList.add('disabled');
                        } else {
                            button.addEventListener('mouseenter', () => this.getCurrentPlayerTable().showColumns(number));
                            button.addEventListener('mouseleave', () => this.getCurrentPlayerTable().showColumns(0));
                        }
                    });
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
                    break;

                // multiplayer state    
                case 'discardCard':
                    this.onEnteringDiscardCard(args);
                    break;
                    
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

            document.getElementById(`player_score_${player.id}`).insertAdjacentHTML('beforebegin', `<div class="vp icon"></div>`);
            document.getElementById(`icon_point_${player.id}`).remove();

            let html = `<div class="counters">
            
                <div id="research-counter-wrapper-${player.id}" class="research-counter">
                    <div class="research icon"></div>
                    <span id="research-counter-${player.id}"></span> <span class="research-legend"><div class="vp icon"></div> / ${_('round')}</span>
                </div>

            </div><div class="counters">
            
                <div id="recruit-counter-wrapper-${player.id}" class="recruit-counter">
                    <div class="recruit icon"></div>
                    <span id="recruit-counter-${player.id}"></span>
                </div>
            
                <div id="bracelet-counter-wrapper-${player.id}" class="bracelet-counter">
                    <div class="bracelet icon"></div>
                    <span id="bracelet-counter-${player.id}"></span>
                </div>
                
            </div>`;

            dojo.place(html, `player_board_${player.id}`);

            this.researchCounters[playerId] = new ebg.counter();
            this.researchCounters[playerId].create(`research-counter-${playerId}`);
            this.researchCounters[playerId].setValue(getVpByResearch(player.research));

            this.recruitCounters[playerId] = new ebg.counter();
            this.recruitCounters[playerId].create(`recruit-counter-${playerId}`);
            this.recruitCounters[playerId].setValue(player.recruit);

            this.braceletCounters[playerId] = new ebg.counter();
            this.braceletCounters[playerId].create(`bracelet-counter-${playerId}`);
            this.braceletCounters[playerId].setValue(player.bracelet);    

            // first player token
            dojo.place(`<div id="player_board_${player.id}_firstPlayerWrapper" class="firstPlayerWrapper"></div>`, `player_board_${player.id}`);

            if (gamedatas.firstPlayerId === playerId) {
                this.placeFirstPlayerToken(gamedatas.firstPlayerId);
            }
        });

        this.setTooltipToClass('research-counter', _('Research'));
        this.setTooltipToClass('recruit-counter', _('Recruits'));
        this.setTooltipToClass('bracelet-counter', _('Bracelets'));
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

    private updateGains(playerId: number, gains: { [type: number]: number }) {
        Object.entries(gains).forEach(entry => {
            const type = Number(entry[0]);
            const amount = entry[1];

            if (amount != 0) {
                switch (type) {
                    case VP:
                        this.setScore(playerId, (this as any).scoreCtrl[playerId].getValue() + amount);
                        break;
                    case BRACELET:
                        this.setBracelets(playerId, this.braceletCounters[playerId].getValue() + amount);
                        break;
                    case RECRUIT:
                        this.setRecruits(playerId, this.recruitCounters[playerId].getValue() + amount);
                        break;
                    case RESEARCH:
                        this.setResearchSpot(playerId, this.tableCenter.getResearch(playerId) + amount);
                        break;
                }
            }
        });
    }

    private setScore(playerId: number, score: number) {
        (this as any).scoreCtrl[playerId]?.toValue(score);
        this.researchBoard.setScore(playerId, score);
    }

    private setSciencePoints(playerId: number, count: number) {
        this.researchCounters[playerId].toValue(count);
        this.researchBoard.setResearchSpot(playerId, count);
    }

    private setResearchSpot(playerId: number, count: number) {
        this.researchBoard.setResearchSpot(playerId, count);
    }

    private setRecruits(playerId: number, count: number) {
        this.recruitCounters[playerId].toValue(count);
        this.getPlayerTable(playerId).updateCounter('recruits', count);
    }

    private setBracelets(playerId: number, count: number) {
        this.braceletCounters[playerId].toValue(count);
        this.getPlayerTable(playerId).updateCounter('bracelets', count);
    }

    private getColorAddHtml() {
        return [1, 2, 3, 4, 5].map(number => `
            <div class="color" data-color="${number}"></div>
            <span class="label"> ${this.getColor(number)}</span>
        `).join('');
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
    
    public onTableDestinationClick(research: Research): void {
        if (this.gamedatas.gamestate.name == 'reserveDestination') {
            this.reserveDestination(research.id);
        } else {
            this.takeDestination(research.id);
        }
    }

    public onPlayerTileClick(card: Tile): void {
        this.activateTile(card.id);
    }

    public onTableCardClick(card: Tile): void {
        if (this.gamedatas.gamestate.name == 'discardTableCard') {
            this.discardTableCard(card.id);
        } else {
            this.chooseNewCard(card.id);
        }
    }

    public onPlayedCardClick(card: Tile): void {
        if (this.gamedatas.gamestate.name == 'discardCard') {
            this.discardCard(card.id);
        } else {
            this.setPayDestinationLabelAndState();
        }
    }

    public onWorkerClick(worker: Worker): void {
        if (this.gamedatas.gamestate.name == 'chooseWorker') {
            this.chooseWorker(worker.id);
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
  	
    public goTrade() {
        if(!(this as any).checkAction('goTrade')) {
            return;
        }

        this.takeAction('goTrade');
    }
  	
    public activateTile(id: number) {
        if(!(this as any).checkAction('activateTile')) {
            return;
        }

        this.takeAction('activateTile', {
            id
        });
    }
  	
    public takeDestination(id: number) {
        if(!(this as any).checkAction('takeDestination')) {
            return;
        }

        this.takeAction('takeDestination', {
            id
        });
    }
  	
    public reserveDestination(id: number) {
        if(!(this as any).checkAction('reserveDestination')) {
            return;
        }

        this.takeAction('reserveDestination', {
            id
        });
    }
  	
    public chooseNewCard(id: number) {
        if(!(this as any).checkAction('chooseNewCard')) {
            return;
        }

        this.takeAction('chooseNewCard', {
            id
        });
    }
  	
    public payDestination() {
        if(!(this as any).checkAction('payDestination')) {
            return;
        }

        const ids = this.getCurrentPlayerTable().getSelectedCards().map(card => card.id);
        const recruits = Number(document.getElementById(`payDestination_button`).dataset.recruits);

        this.takeAction('payDestination', {
            ids: ids.join(','),
            recruits
        });
    }
  	
    public trade(number: number, gainsByBracelets: { [bracelets: number]: number } | null) {
        if(!(this as any).checkAction('trade')) {
            return;
        }

        let warning = null;
        if (gainsByBracelets != null) {
            if (gainsByBracelets[number] == 0) {
                warning = _("Are you sure you want to trade ${bracelets} bracelet(s) ?").replace('${bracelets}', number) + ' '+ _("There is nothing to gain yet with this number of bracelet(s)");
            } else if (number > 1 && gainsByBracelets[number] == gainsByBracelets[number - 1]) {
                warning = _("Are you sure you want to trade ${bracelets} bracelet(s) ?").replace('${bracelets}', number) + ' '+ _("You would gain the same with one less bracelet");
            }
        }

        if (warning != null) {
            (this as any).confirmationDialog(warning, () => this.trade(number, null));
            return;
        }

        this.takeAction('trade', {
            number
        });
    }
  	
    public cancel() {
        if(!(this as any).checkAction('cancel')) {
            return;
        }

        this.takeAction('cancel');
    }
  	
    public endTurn() {
        if(!(this as any).checkAction('endTurn')) {
            return;
        }

        this.takeAction('endTurn');
    }
  	
    public discardTableCard(id: number) {
        if(!(this as any).checkAction('discardTableCard')) {
            return;
        }

        this.takeAction('discardTableCard', {
            id
        });
    }
  	
    public discardCard(id: number) {
        if(!(this as any).checkAction('discardCard')) {
            return;
        }

        this.takeAction('discardCard', {
            id
        });
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
            ['removeTile', ANIMATION_MS],
            ['disableWorker', ANIMATION_MS],
            ['gainTimeUnit', ANIMATION_MS],
        ];
    
        notifs.forEach((notif) => {
            dojo.subscribe(notif[0], this, (notifDetails: Notif<any>) => {
                log(`notif_${notif[0]}`, notifDetails.args);

                const promise = this[`notif_${notif[0]}`](notifDetails.args);

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

    notif_activateTile(args: NotifActivateTileArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.activateTile(args.tile);
    }

    notif_removeTile(args: NotifRemoveTileArgs) {
        const playerId = args.playerId;
        const playerTable = this.getPlayerTable(playerId);

        playerTable.removeTile(args.tile);
    }

    notif_disableWorker(args: NotifDisableWorkerArgs) {
        this.setWorkerDisabled(args.worker, true);
    }

    notif_gainTimeUnit(args: NotifGainTimeUnitArgs) {
        const { workers } = args;
        workers.forEach(worker => this.tableCenter.moveWorker(worker));
    }

    private setWorkerDisabled(worker: Worker, disabled: boolean) {
        document.getElementById(`worker-${worker.id}`).classList.toggle('disabled-worker', disabled);
    }

    public getGain(type: number): string {
        switch (type) {
            case 1: return _("Victory Point");
            case 2: return _("Bracelet");
            case 3: return _("Recruit");
            case 4: return _("Research");
            case 5: return _("Card");
        }
    }

    public getTooltipGain(type: number): string {
        return `${this.getGain(type)} (<div class="icon" data-type="${type}"></div>)`;
    }

    public getColor(color: number): string {
        switch (color) {
            case 1: return _("Red");
            case 2: return _("Yellow");
            case 3: return _("Green");
            case 4: return _("Blue");
            case 5: return _("Purple");
        }
    }

    public getTooltipColor(color: number): string {
        return `${this.getColor(color)} (<div class="color" data-color="${color}"></div>)`;
    }

    /* This enable to inject translatable styled things to logs or action bar */
    /* @Override */
    public format_string_recursive(log: string, args: any) {
        try {
            if (log && args && !args.processed) {
                if (args.gains && (typeof args.gains !== 'string' || args.gains[0] !== '<')) {
                    const entries = Object.entries(args.gains);
                    args.gains = entries.length ? entries.map(entry => `<strong>${entry[1]}</strong> <div class="icon" data-type="${entry[0]}"></div>`).join(' ') : `<strong>${_('nothing')}</strong>`;
                }

                for (const property in args) {
                    if (['number', 'color', 'card_color', 'card_type', 'objective_name'].includes(property) && args[property][0] != '<') {
                        args[property] = `<strong>${_(args[property])}</strong>`;
                    }
                }
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return (this as any).inherited(arguments);
    }
}