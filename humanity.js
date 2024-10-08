var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var DEFAULT_ZOOM_LEVELS = [0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
function throttle(callback, delay) {
    var last;
    var timer;
    return function () {
        var context = this;
        var now = +new Date();
        var args = arguments;
        if (last && now < last + delay) {
            clearTimeout(timer);
            timer = setTimeout(function () {
                last = now;
                callback.apply(context, args);
            }, delay);
        }
        else {
            last = now;
            callback.apply(context, args);
        }
    };
}
var advThrottle = function (func, delay, options) {
    if (options === void 0) { options = { leading: true, trailing: false }; }
    var timer = null, lastRan = null, trailingArgs = null;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (timer) { //called within cooldown period
            lastRan = this; //update context
            trailingArgs = args; //save for later
            return;
        }
        if (options.leading) { // if leading
            func.call.apply(// if leading
            func, __spreadArray([this], args, false)); //call the 1st instance
        }
        else { // else it's trailing
            lastRan = this; //update context
            trailingArgs = args; //save for later
        }
        var coolDownPeriodComplete = function () {
            if (options.trailing && trailingArgs) { // if trailing and the trailing args exist
                func.call.apply(// if trailing and the trailing args exist
                func, __spreadArray([lastRan], trailingArgs, false)); //invoke the instance with stored context "lastRan"
                lastRan = null; //reset the status of lastRan
                trailingArgs = null; //reset trailing arguments
                timer = setTimeout(coolDownPeriodComplete, delay); //clear the timout
            }
            else {
                timer = null; // reset timer
            }
        };
        timer = setTimeout(coolDownPeriodComplete, delay);
    };
};
var ZoomManager = /** @class */ (function () {
    /**
     * Place the settings.element in a zoom wrapper and init zoomControls.
     *
     * @param settings: a `ZoomManagerSettings` object
     */
    function ZoomManager(settings) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        this.settings = settings;
        if (!settings.element) {
            throw new DOMException('You need to set the element to wrap in the zoom element');
        }
        this._zoomLevels = (_a = settings.zoomLevels) !== null && _a !== void 0 ? _a : DEFAULT_ZOOM_LEVELS;
        this._zoom = this.settings.defaultZoom || 1;
        if (this.settings.localStorageZoomKey) {
            var zoomStr = localStorage.getItem(this.settings.localStorageZoomKey);
            if (zoomStr) {
                this._zoom = Number(zoomStr);
            }
        }
        this.wrapper = document.createElement('div');
        this.wrapper.id = 'bga-zoom-wrapper';
        this.wrapElement(this.wrapper, settings.element);
        this.wrapper.appendChild(settings.element);
        settings.element.classList.add('bga-zoom-inner');
        if ((_b = settings.smooth) !== null && _b !== void 0 ? _b : true) {
            settings.element.dataset.smooth = 'true';
            settings.element.addEventListener('transitionend', advThrottle(function () { return _this.zoomOrDimensionChanged(); }, this.throttleTime, { leading: true, trailing: true, }));
        }
        if ((_d = (_c = settings.zoomControls) === null || _c === void 0 ? void 0 : _c.visible) !== null && _d !== void 0 ? _d : true) {
            this.initZoomControls(settings);
        }
        if (this._zoom !== 1) {
            this.setZoom(this._zoom);
        }
        this.throttleTime = (_e = settings.throttleTime) !== null && _e !== void 0 ? _e : 100;
        window.addEventListener('resize', advThrottle(function () {
            var _a;
            _this.zoomOrDimensionChanged();
            if ((_a = _this.settings.autoZoom) === null || _a === void 0 ? void 0 : _a.expectedWidth) {
                _this.setAutoZoom();
            }
        }, this.throttleTime, { leading: true, trailing: true, }));
        if (window.ResizeObserver) {
            new ResizeObserver(advThrottle(function () { return _this.zoomOrDimensionChanged(); }, this.throttleTime, { leading: true, trailing: true, })).observe(settings.element);
        }
        if ((_f = this.settings.autoZoom) === null || _f === void 0 ? void 0 : _f.expectedWidth) {
            this.setAutoZoom();
        }
    }
    Object.defineProperty(ZoomManager.prototype, "zoom", {
        /**
         * Returns the zoom level
         */
        get: function () {
            return this._zoom;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ZoomManager.prototype, "zoomLevels", {
        /**
         * Returns the zoom levels
         */
        get: function () {
            return this._zoomLevels;
        },
        enumerable: false,
        configurable: true
    });
    ZoomManager.prototype.setAutoZoom = function () {
        var _this = this;
        var _a, _b, _c;
        var zoomWrapperWidth = document.getElementById('bga-zoom-wrapper').clientWidth;
        if (!zoomWrapperWidth) {
            setTimeout(function () { return _this.setAutoZoom(); }, 200);
            return;
        }
        var expectedWidth = (_a = this.settings.autoZoom) === null || _a === void 0 ? void 0 : _a.expectedWidth;
        var newZoom = this.zoom;
        while (newZoom > this._zoomLevels[0] && newZoom > ((_c = (_b = this.settings.autoZoom) === null || _b === void 0 ? void 0 : _b.minZoomLevel) !== null && _c !== void 0 ? _c : 0) && zoomWrapperWidth / newZoom < expectedWidth) {
            newZoom = this._zoomLevels[this._zoomLevels.indexOf(newZoom) - 1];
        }
        if (this._zoom == newZoom) {
            if (this.settings.localStorageZoomKey) {
                localStorage.setItem(this.settings.localStorageZoomKey, '' + this._zoom);
            }
        }
        else {
            this.setZoom(newZoom);
        }
    };
    /**
     * Sets the available zoomLevels and new zoom to the provided values.
     * @param zoomLevels the new array of zoomLevels that can be used.
     * @param newZoom if provided the zoom will be set to this value, if not the last element of the zoomLevels array will be set as the new zoom
     */
    ZoomManager.prototype.setZoomLevels = function (zoomLevels, newZoom) {
        if (!zoomLevels || zoomLevels.length <= 0) {
            return;
        }
        this._zoomLevels = zoomLevels;
        var zoomIndex = newZoom && zoomLevels.includes(newZoom) ? this._zoomLevels.indexOf(newZoom) : this._zoomLevels.length - 1;
        this.setZoom(this._zoomLevels[zoomIndex]);
    };
    /**
     * Set the zoom level. Ideally, use a zoom level in the zoomLevels range.
     * @param zoom zool level
     */
    ZoomManager.prototype.setZoom = function (zoom) {
        var _a, _b, _c, _d;
        if (zoom === void 0) { zoom = 1; }
        this._zoom = zoom;
        if (this.settings.localStorageZoomKey) {
            localStorage.setItem(this.settings.localStorageZoomKey, '' + this._zoom);
        }
        var newIndex = this._zoomLevels.indexOf(this._zoom);
        (_a = this.zoomInButton) === null || _a === void 0 ? void 0 : _a.classList.toggle('disabled', newIndex === this._zoomLevels.length - 1);
        (_b = this.zoomOutButton) === null || _b === void 0 ? void 0 : _b.classList.toggle('disabled', newIndex === 0);
        this.settings.element.style.transform = zoom === 1 ? '' : "scale(".concat(zoom, ")");
        (_d = (_c = this.settings).onZoomChange) === null || _d === void 0 ? void 0 : _d.call(_c, this._zoom);
        this.zoomOrDimensionChanged();
    };
    /**
     * Call this method for the browsers not supporting ResizeObserver, everytime the table height changes, if you know it.
     * If the browsert is recent enough (>= Safari 13.1) it will just be ignored.
     */
    ZoomManager.prototype.manualHeightUpdate = function () {
        if (!window.ResizeObserver) {
            this.zoomOrDimensionChanged();
        }
    };
    /**
     * Everytime the element dimensions changes, we update the style. And call the optional callback.
     * Unsafe method as this is not protected by throttle. Surround with  `advThrottle(() => this.zoomOrDimensionChanged(), this.throttleTime, { leading: true, trailing: true, })` to avoid spamming recomputation.
     */
    ZoomManager.prototype.zoomOrDimensionChanged = function () {
        var _a, _b;
        this.settings.element.style.width = "".concat(this.wrapper.offsetWidth / this._zoom, "px");
        this.wrapper.style.height = "".concat(this.settings.element.offsetHeight * this._zoom, "px");
        (_b = (_a = this.settings).onDimensionsChange) === null || _b === void 0 ? void 0 : _b.call(_a, this._zoom);
    };
    /**
     * Simulates a click on the Zoom-in button.
     */
    ZoomManager.prototype.zoomIn = function () {
        if (this._zoom === this._zoomLevels[this._zoomLevels.length - 1]) {
            return;
        }
        var newIndex = this._zoomLevels.indexOf(this._zoom) + 1;
        this.setZoom(newIndex === -1 ? 1 : this._zoomLevels[newIndex]);
    };
    /**
     * Simulates a click on the Zoom-out button.
     */
    ZoomManager.prototype.zoomOut = function () {
        if (this._zoom === this._zoomLevels[0]) {
            return;
        }
        var newIndex = this._zoomLevels.indexOf(this._zoom) - 1;
        this.setZoom(newIndex === -1 ? 1 : this._zoomLevels[newIndex]);
    };
    /**
     * Changes the color of the zoom controls.
     */
    ZoomManager.prototype.setZoomControlsColor = function (color) {
        if (this.zoomControls) {
            this.zoomControls.dataset.color = color;
        }
    };
    /**
     * Set-up the zoom controls
     * @param settings a `ZoomManagerSettings` object.
     */
    ZoomManager.prototype.initZoomControls = function (settings) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        this.zoomControls = document.createElement('div');
        this.zoomControls.id = 'bga-zoom-controls';
        this.zoomControls.dataset.position = (_b = (_a = settings.zoomControls) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : 'top-right';
        this.zoomOutButton = document.createElement('button');
        this.zoomOutButton.type = 'button';
        this.zoomOutButton.addEventListener('click', function () { return _this.zoomOut(); });
        if ((_c = settings.zoomControls) === null || _c === void 0 ? void 0 : _c.customZoomOutElement) {
            settings.zoomControls.customZoomOutElement(this.zoomOutButton);
        }
        else {
            this.zoomOutButton.classList.add("bga-zoom-out-icon");
        }
        this.zoomInButton = document.createElement('button');
        this.zoomInButton.type = 'button';
        this.zoomInButton.addEventListener('click', function () { return _this.zoomIn(); });
        if ((_d = settings.zoomControls) === null || _d === void 0 ? void 0 : _d.customZoomInElement) {
            settings.zoomControls.customZoomInElement(this.zoomInButton);
        }
        else {
            this.zoomInButton.classList.add("bga-zoom-in-icon");
        }
        this.zoomControls.appendChild(this.zoomOutButton);
        this.zoomControls.appendChild(this.zoomInButton);
        this.wrapper.appendChild(this.zoomControls);
        this.setZoomControlsColor((_f = (_e = settings.zoomControls) === null || _e === void 0 ? void 0 : _e.color) !== null && _f !== void 0 ? _f : 'black');
    };
    /**
     * Wraps an element around an existing DOM element
     * @param wrapper the wrapper element
     * @param element the existing element
     */
    ZoomManager.prototype.wrapElement = function (wrapper, element) {
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
    };
    return ZoomManager;
}());
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BgaHelpButton = /** @class */ (function () {
    function BgaHelpButton() {
    }
    return BgaHelpButton;
}());
var BgaHelpPopinButton = /** @class */ (function (_super) {
    __extends(BgaHelpPopinButton, _super);
    function BgaHelpPopinButton(settings) {
        var _this = _super.call(this) || this;
        _this.settings = settings;
        return _this;
    }
    BgaHelpPopinButton.prototype.add = function (toElement) {
        var _a;
        var _this = this;
        var button = document.createElement('button');
        (_a = button.classList).add.apply(_a, __spreadArray(['bga-help_button', 'bga-help_popin-button'], (this.settings.buttonExtraClasses ? this.settings.buttonExtraClasses.split(/\s+/g) : []), false));
        button.innerHTML = "?";
        if (this.settings.buttonBackground) {
            button.style.setProperty('--background', this.settings.buttonBackground);
        }
        if (this.settings.buttonColor) {
            button.style.setProperty('--color', this.settings.buttonColor);
        }
        toElement.appendChild(button);
        button.addEventListener('click', function () { return _this.showHelp(); });
    };
    BgaHelpPopinButton.prototype.showHelp = function () {
        var _a, _b, _c;
        var popinDialog = new window.ebg.popindialog();
        popinDialog.create('bgaHelpDialog');
        popinDialog.setTitle(this.settings.title);
        popinDialog.setContent("<div id=\"help-dialog-content\">".concat((_a = this.settings.html) !== null && _a !== void 0 ? _a : '', "</div>"));
        (_c = (_b = this.settings).onPopinCreated) === null || _c === void 0 ? void 0 : _c.call(_b, document.getElementById('help-dialog-content'));
        popinDialog.show();
    };
    return BgaHelpPopinButton;
}(BgaHelpButton));
var BgaHelpExpandableButton = /** @class */ (function (_super) {
    __extends(BgaHelpExpandableButton, _super);
    function BgaHelpExpandableButton(settings) {
        var _this = _super.call(this) || this;
        _this.settings = settings;
        return _this;
    }
    BgaHelpExpandableButton.prototype.add = function (toElement) {
        var _a;
        var _this = this;
        var _b, _c, _d, _e, _f, _g, _h, _j;
        var folded = (_b = this.settings.defaultFolded) !== null && _b !== void 0 ? _b : true;
        if (this.settings.localStorageFoldedKey) {
            var localStorageValue = localStorage.getItem(this.settings.localStorageFoldedKey);
            if (localStorageValue) {
                folded = localStorageValue == 'true';
            }
        }
        var button = document.createElement('button');
        button.dataset.folded = folded.toString();
        (_a = button.classList).add.apply(_a, __spreadArray(['bga-help_button', 'bga-help_expandable-button'], (this.settings.buttonExtraClasses ? this.settings.buttonExtraClasses.split(/\s+/g) : []), false));
        button.innerHTML = "\n            <div class=\"bga-help_folded-content ".concat(((_c = this.settings.foldedContentExtraClasses) !== null && _c !== void 0 ? _c : '').split(/\s+/g), "\">").concat((_d = this.settings.foldedHtml) !== null && _d !== void 0 ? _d : '', "</div>\n            <div class=\"bga-help_unfolded-content  ").concat(((_e = this.settings.unfoldedContentExtraClasses) !== null && _e !== void 0 ? _e : '').split(/\s+/g), "\">").concat((_f = this.settings.unfoldedHtml) !== null && _f !== void 0 ? _f : '', "</div>\n        ");
        button.style.setProperty('--expanded-width', (_g = this.settings.expandedWidth) !== null && _g !== void 0 ? _g : 'auto');
        button.style.setProperty('--expanded-height', (_h = this.settings.expandedHeight) !== null && _h !== void 0 ? _h : 'auto');
        button.style.setProperty('--expanded-radius', (_j = this.settings.expandedRadius) !== null && _j !== void 0 ? _j : '10px');
        toElement.appendChild(button);
        button.addEventListener('click', function () {
            button.dataset.folded = button.dataset.folded == 'true' ? 'false' : 'true';
            if (_this.settings.localStorageFoldedKey) {
                localStorage.setItem(_this.settings.localStorageFoldedKey, button.dataset.folded);
            }
        });
    };
    return BgaHelpExpandableButton;
}(BgaHelpButton));
var HelpManager = /** @class */ (function () {
    function HelpManager(game, settings) {
        this.game = game;
        if (!(settings === null || settings === void 0 ? void 0 : settings.buttons)) {
            throw new Error('HelpManager need a `buttons` list in the settings.');
        }
        var leftSide = document.getElementById('left-side');
        var buttons = document.createElement('div');
        buttons.id = "bga-help_buttons";
        leftSide.appendChild(buttons);
        settings.buttons.forEach(function (button) { return button.add(buttons); });
    }
    return HelpManager;
}());
/**
 * Jump to entry.
 */
var JumpToEntry = /** @class */ (function () {
    function JumpToEntry(
    /**
     * Label shown on the entry. For players, it's player name.
     */
    label, 
    /**
     * HTML Element id, to scroll into view when clicked.
     */
    targetId, 
    /**
     * Any element that is useful to customize the link.
     * Basic ones are 'color' and 'colorback'.
     */
    data) {
        if (data === void 0) { data = {}; }
        this.label = label;
        this.targetId = targetId;
        this.data = data;
    }
    return JumpToEntry;
}());
var JumpToManager = /** @class */ (function () {
    function JumpToManager(game, settings) {
        var _a, _b, _c;
        this.game = game;
        this.settings = settings;
        var entries = __spreadArray(__spreadArray([], ((_a = settings === null || settings === void 0 ? void 0 : settings.topEntries) !== null && _a !== void 0 ? _a : []), true), ((_b = settings === null || settings === void 0 ? void 0 : settings.playersEntries) !== null && _b !== void 0 ? _b : this.createEntries(Object.values(game.gamedatas.players))), true);
        this.createPlayerJumps(entries);
        var folded = (_c = settings === null || settings === void 0 ? void 0 : settings.defaultFolded) !== null && _c !== void 0 ? _c : false;
        if (settings === null || settings === void 0 ? void 0 : settings.localStorageFoldedKey) {
            var localStorageValue = localStorage.getItem(settings.localStorageFoldedKey);
            if (localStorageValue) {
                folded = localStorageValue == 'true';
            }
        }
        document.getElementById('bga-jump-to_controls').classList.toggle('folded', folded);
    }
    JumpToManager.prototype.createPlayerJumps = function (entries) {
        var _this = this;
        var _a, _b, _c, _d;
        document.getElementById("game_play_area_wrap").insertAdjacentHTML('afterend', "\n        <div id=\"bga-jump-to_controls\">        \n            <div id=\"bga-jump-to_toggle\" class=\"bga-jump-to_link ".concat((_b = (_a = this.settings) === null || _a === void 0 ? void 0 : _a.entryClasses) !== null && _b !== void 0 ? _b : '', " toggle\" style=\"--color: ").concat((_d = (_c = this.settings) === null || _c === void 0 ? void 0 : _c.toggleColor) !== null && _d !== void 0 ? _d : 'black', "\">\n                \u21D4\n            </div>\n        </div>"));
        document.getElementById("bga-jump-to_toggle").addEventListener('click', function () { return _this.jumpToggle(); });
        entries.forEach(function (entry) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            var html = "<div id=\"bga-jump-to_".concat(entry.targetId, "\" class=\"bga-jump-to_link ").concat((_b = (_a = _this.settings) === null || _a === void 0 ? void 0 : _a.entryClasses) !== null && _b !== void 0 ? _b : '', "\">");
            if ((_d = (_c = _this.settings) === null || _c === void 0 ? void 0 : _c.showEye) !== null && _d !== void 0 ? _d : true) {
                html += "<div class=\"eye\"></div>";
            }
            if (((_f = (_e = _this.settings) === null || _e === void 0 ? void 0 : _e.showAvatar) !== null && _f !== void 0 ? _f : true) && ((_g = entry.data) === null || _g === void 0 ? void 0 : _g.id)) {
                var cssUrl = (_h = entry.data) === null || _h === void 0 ? void 0 : _h.avatarUrl;
                if (!cssUrl) {
                    var img = document.getElementById("avatar_".concat(entry.data.id));
                    var url = img === null || img === void 0 ? void 0 : img.src;
                    // ? Custom image : Bga Image
                    //url = url.replace('_32', url.indexOf('data/avatar/defaults') > 0 ? '' : '_184');
                    if (url) {
                        cssUrl = "url('".concat(url, "')");
                    }
                }
                if (cssUrl) {
                    html += "<div class=\"bga-jump-to_avatar\" style=\"--avatar-url: ".concat(cssUrl, ";\"></div>");
                }
            }
            html += "\n                <span class=\"bga-jump-to_label\">".concat(entry.label, "</span>\n            </div>");
            //
            document.getElementById("bga-jump-to_controls").insertAdjacentHTML('beforeend', html);
            var entryDiv = document.getElementById("bga-jump-to_".concat(entry.targetId));
            Object.getOwnPropertyNames((_j = entry.data) !== null && _j !== void 0 ? _j : []).forEach(function (key) {
                entryDiv.dataset[key] = entry.data[key];
                entryDiv.style.setProperty("--".concat(key), entry.data[key]);
            });
            entryDiv.addEventListener('click', function () { return _this.jumpTo(entry.targetId); });
        });
        var jumpDiv = document.getElementById("bga-jump-to_controls");
        jumpDiv.style.marginTop = "-".concat(Math.round(jumpDiv.getBoundingClientRect().height / 2), "px");
    };
    JumpToManager.prototype.jumpToggle = function () {
        var _a;
        var jumpControls = document.getElementById('bga-jump-to_controls');
        jumpControls.classList.toggle('folded');
        if ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.localStorageFoldedKey) {
            localStorage.setItem(this.settings.localStorageFoldedKey, jumpControls.classList.contains('folded').toString());
        }
    };
    JumpToManager.prototype.jumpTo = function (targetId) {
        document.getElementById(targetId).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };
    JumpToManager.prototype.getOrderedPlayers = function (unorderedPlayers) {
        var _this = this;
        var players = unorderedPlayers.sort(function (a, b) { return Number(a.playerNo) - Number(b.playerNo); });
        var playerIndex = players.findIndex(function (player) { return Number(player.id) === Number(_this.game.player_id); });
        var orderedPlayers = playerIndex > 0 ? __spreadArray(__spreadArray([], players.slice(playerIndex), true), players.slice(0, playerIndex), true) : players;
        return orderedPlayers;
    };
    JumpToManager.prototype.createEntries = function (players) {
        var orderedPlayers = this.getOrderedPlayers(players);
        return orderedPlayers.map(function (player) { return new JumpToEntry(player.name, "player-table-".concat(player.id), {
            'color': '#' + player.color,
            'colorback': player.color_back ? '#' + player.color_back : null,
            'id': player.id,
        }); });
    };
    return JumpToManager;
}());
var BgaAnimation = /** @class */ (function () {
    function BgaAnimation(animationFunction, settings) {
        this.animationFunction = animationFunction;
        this.settings = settings;
        this.played = null;
        this.result = null;
        this.playWhenNoAnimation = false;
    }
    return BgaAnimation;
}());
/**
 * Just use playSequence from animationManager
 *
 * @param animationManager the animation manager
 * @param animation a `BgaAnimation` object
 * @returns a promise when animation ends
 */
function attachWithAnimation(animationManager, animation) {
    var _a;
    var settings = animation.settings;
    var element = settings.animation.settings.element;
    var fromRect = element.getBoundingClientRect();
    settings.animation.settings.fromRect = fromRect;
    settings.attachElement.appendChild(element);
    (_a = settings.afterAttach) === null || _a === void 0 ? void 0 : _a.call(settings, element, settings.attachElement);
    return animationManager.play(settings.animation);
}
var BgaAttachWithAnimation = /** @class */ (function (_super) {
    __extends(BgaAttachWithAnimation, _super);
    function BgaAttachWithAnimation(settings) {
        var _this = _super.call(this, attachWithAnimation, settings) || this;
        _this.playWhenNoAnimation = true;
        return _this;
    }
    return BgaAttachWithAnimation;
}(BgaAnimation));
/**
 * Just use playSequence from animationManager
 *
 * @param animationManager the animation manager
 * @param animation a `BgaAnimation` object
 * @returns a promise when animation ends
 */
function cumulatedAnimations(animationManager, animation) {
    return animationManager.playSequence(animation.settings.animations);
}
var BgaCumulatedAnimation = /** @class */ (function (_super) {
    __extends(BgaCumulatedAnimation, _super);
    function BgaCumulatedAnimation(settings) {
        var _this = _super.call(this, cumulatedAnimations, settings) || this;
        _this.playWhenNoAnimation = true;
        return _this;
    }
    return BgaCumulatedAnimation;
}(BgaAnimation));
/**
 * Linear slide of the element from origin to destination.
 *
 * @param animationManager the animation manager
 * @param animation a `BgaAnimation` object
 * @returns a promise when animation ends
 */
function slideToAnimation(animationManager, animation) {
    var promise = new Promise(function (success) {
        var _a, _b, _c, _d;
        var settings = animation.settings;
        var element = settings.element;
        var _e = getDeltaCoordinates(element, settings), x = _e.x, y = _e.y;
        var duration = (_a = settings === null || settings === void 0 ? void 0 : settings.duration) !== null && _a !== void 0 ? _a : 500;
        var originalZIndex = element.style.zIndex;
        var originalTransition = element.style.transition;
        element.style.zIndex = "".concat((_b = settings === null || settings === void 0 ? void 0 : settings.zIndex) !== null && _b !== void 0 ? _b : 10);
        var timeoutId = null;
        var cleanOnTransitionEnd = function () {
            element.style.zIndex = originalZIndex;
            element.style.transition = originalTransition;
            success();
            element.removeEventListener('transitioncancel', cleanOnTransitionEnd);
            element.removeEventListener('transitionend', cleanOnTransitionEnd);
            document.removeEventListener('visibilitychange', cleanOnTransitionEnd);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
        var cleanOnTransitionCancel = function () {
            var _a;
            element.style.transition = "";
            element.offsetHeight;
            element.style.transform = (_a = settings === null || settings === void 0 ? void 0 : settings.finalTransform) !== null && _a !== void 0 ? _a : null;
            element.offsetHeight;
            cleanOnTransitionEnd();
        };
        element.addEventListener('transitioncancel', cleanOnTransitionEnd);
        element.addEventListener('transitionend', cleanOnTransitionEnd);
        document.addEventListener('visibilitychange', cleanOnTransitionCancel);
        element.offsetHeight;
        element.style.transition = "transform ".concat(duration, "ms linear");
        element.offsetHeight;
        element.style.transform = "translate(".concat(-x, "px, ").concat(-y, "px) rotate(").concat((_c = settings === null || settings === void 0 ? void 0 : settings.rotationDelta) !== null && _c !== void 0 ? _c : 0, "deg) scale(").concat((_d = settings.scale) !== null && _d !== void 0 ? _d : 1, ")");
        // safety in case transitionend and transitioncancel are not called
        timeoutId = setTimeout(cleanOnTransitionEnd, duration + 100);
    });
    return promise;
}
var BgaSlideToAnimation = /** @class */ (function (_super) {
    __extends(BgaSlideToAnimation, _super);
    function BgaSlideToAnimation(settings) {
        return _super.call(this, slideToAnimation, settings) || this;
    }
    return BgaSlideToAnimation;
}(BgaAnimation));
/**
 * Linear slide of the element from origin to destination.
 *
 * @param animationManager the animation manager
 * @param animation a `BgaAnimation` object
 * @returns a promise when animation ends
 */
function slideAnimation(animationManager, animation) {
    var promise = new Promise(function (success) {
        var _a, _b, _c, _d;
        var settings = animation.settings;
        var element = settings.element;
        var _e = getDeltaCoordinates(element, settings), x = _e.x, y = _e.y;
        var duration = (_a = settings === null || settings === void 0 ? void 0 : settings.duration) !== null && _a !== void 0 ? _a : 500;
        var originalZIndex = element.style.zIndex;
        var originalTransition = element.style.transition;
        element.style.zIndex = "".concat((_b = settings === null || settings === void 0 ? void 0 : settings.zIndex) !== null && _b !== void 0 ? _b : 10);
        element.style.transition = null;
        element.offsetHeight;
        element.style.transform = "translate(".concat(-x, "px, ").concat(-y, "px) rotate(").concat((_c = settings === null || settings === void 0 ? void 0 : settings.rotationDelta) !== null && _c !== void 0 ? _c : 0, "deg)");
        var timeoutId = null;
        var cleanOnTransitionEnd = function () {
            element.style.zIndex = originalZIndex;
            element.style.transition = originalTransition;
            success();
            element.removeEventListener('transitioncancel', cleanOnTransitionEnd);
            element.removeEventListener('transitionend', cleanOnTransitionEnd);
            document.removeEventListener('visibilitychange', cleanOnTransitionEnd);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
        var cleanOnTransitionCancel = function () {
            var _a;
            element.style.transition = "";
            element.offsetHeight;
            element.style.transform = (_a = settings === null || settings === void 0 ? void 0 : settings.finalTransform) !== null && _a !== void 0 ? _a : null;
            element.offsetHeight;
            cleanOnTransitionEnd();
        };
        element.addEventListener('transitioncancel', cleanOnTransitionCancel);
        element.addEventListener('transitionend', cleanOnTransitionEnd);
        document.addEventListener('visibilitychange', cleanOnTransitionCancel);
        element.offsetHeight;
        element.style.transition = "transform ".concat(duration, "ms linear");
        element.offsetHeight;
        element.style.transform = (_d = settings === null || settings === void 0 ? void 0 : settings.finalTransform) !== null && _d !== void 0 ? _d : null;
        // safety in case transitionend and transitioncancel are not called
        timeoutId = setTimeout(cleanOnTransitionEnd, duration + 100);
    });
    return promise;
}
var BgaSlideAnimation = /** @class */ (function (_super) {
    __extends(BgaSlideAnimation, _super);
    function BgaSlideAnimation(settings) {
        return _super.call(this, slideAnimation, settings) || this;
    }
    return BgaSlideAnimation;
}(BgaAnimation));
function shouldAnimate(settings) {
    var _a;
    return document.visibilityState !== 'hidden' && !((_a = settings === null || settings === void 0 ? void 0 : settings.game) === null || _a === void 0 ? void 0 : _a.instantaneousMode);
}
/**
 * Return the x and y delta, based on the animation settings;
 *
 * @param settings an `AnimationSettings` object
 * @returns a promise when animation ends
 */
function getDeltaCoordinates(element, settings) {
    var _a;
    if (!settings.fromDelta && !settings.fromRect && !settings.fromElement) {
        throw new Error("[bga-animation] fromDelta, fromRect or fromElement need to be set");
    }
    var x = 0;
    var y = 0;
    if (settings.fromDelta) {
        x = settings.fromDelta.x;
        y = settings.fromDelta.y;
    }
    else {
        var originBR = (_a = settings.fromRect) !== null && _a !== void 0 ? _a : settings.fromElement.getBoundingClientRect();
        // TODO make it an option ?
        var originalTransform = element.style.transform;
        element.style.transform = '';
        var destinationBR = element.getBoundingClientRect();
        element.style.transform = originalTransform;
        x = (destinationBR.left + destinationBR.right) / 2 - (originBR.left + originBR.right) / 2;
        y = (destinationBR.top + destinationBR.bottom) / 2 - (originBR.top + originBR.bottom) / 2;
    }
    if (settings.scale) {
        x /= settings.scale;
        y /= settings.scale;
    }
    return { x: x, y: y };
}
function logAnimation(animationManager, animation) {
    var settings = animation.settings;
    var element = settings.element;
    if (element) {
        console.log(animation, settings, element, element.getBoundingClientRect(), element.style.transform);
    }
    else {
        console.log(animation, settings);
    }
    return Promise.resolve(false);
}
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var AnimationManager = /** @class */ (function () {
    /**
     * @param game the BGA game class, usually it will be `this`
     * @param settings: a `AnimationManagerSettings` object
     */
    function AnimationManager(game, settings) {
        this.game = game;
        this.settings = settings;
        this.zoomManager = settings === null || settings === void 0 ? void 0 : settings.zoomManager;
        if (!game) {
            throw new Error('You must set your game as the first parameter of AnimationManager');
        }
    }
    AnimationManager.prototype.getZoomManager = function () {
        return this.zoomManager;
    };
    /**
     * Set the zoom manager, to get the scale of the current game.
     *
     * @param zoomManager the zoom manager
     */
    AnimationManager.prototype.setZoomManager = function (zoomManager) {
        this.zoomManager = zoomManager;
    };
    AnimationManager.prototype.getSettings = function () {
        return this.settings;
    };
    /**
     * Returns if the animations are active. Animation aren't active when the window is not visible (`document.visibilityState === 'hidden'`), or `game.instantaneousMode` is true.
     *
     * @returns if the animations are active.
     */
    AnimationManager.prototype.animationsActive = function () {
        return document.visibilityState !== 'hidden' && !this.game.instantaneousMode;
    };
    /**
     * Plays an animation if the animations are active. Animation aren't active when the window is not visible (`document.visibilityState === 'hidden'`), or `game.instantaneousMode` is true.
     *
     * @param animation the animation to play
     * @returns the animation promise.
     */
    AnimationManager.prototype.play = function (animation) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, _a;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        animation.played = animation.playWhenNoAnimation || this.animationsActive();
                        if (!animation.played) return [3 /*break*/, 2];
                        settings = animation.settings;
                        (_b = settings.animationStart) === null || _b === void 0 ? void 0 : _b.call(settings, animation);
                        (_c = settings.element) === null || _c === void 0 ? void 0 : _c.classList.add((_d = settings.animationClass) !== null && _d !== void 0 ? _d : 'bga-animations_animated');
                        animation.settings = __assign(__assign({}, animation.settings), { duration: (_f = (_e = this.settings) === null || _e === void 0 ? void 0 : _e.duration) !== null && _f !== void 0 ? _f : 500, scale: (_h = (_g = this.zoomManager) === null || _g === void 0 ? void 0 : _g.zoom) !== null && _h !== void 0 ? _h : undefined });
                        _a = animation;
                        return [4 /*yield*/, animation.animationFunction(this, animation)];
                    case 1:
                        _a.result = _o.sent();
                        (_k = (_j = animation.settings).animationEnd) === null || _k === void 0 ? void 0 : _k.call(_j, animation);
                        (_l = settings.element) === null || _l === void 0 ? void 0 : _l.classList.remove((_m = settings.animationClass) !== null && _m !== void 0 ? _m : 'bga-animations_animated');
                        return [3 /*break*/, 3];
                    case 2: return [2 /*return*/, Promise.resolve(animation)];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Plays multiple animations in parallel.
     *
     * @param animations the animations to play
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playParallel = function (animations) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(animations.map(function (animation) { return _this.play(animation); }))];
            });
        });
    };
    /**
     * Plays multiple animations in sequence (the second when the first ends, ...).
     *
     * @param animations the animations to play
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playSequence = function (animations) {
        return __awaiter(this, void 0, void 0, function () {
            var result, others;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!animations.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.play(animations[0])];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, this.playSequence(animations.slice(1))];
                    case 2:
                        others = _a.sent();
                        return [2 /*return*/, __spreadArray([result], others, true)];
                    case 3: return [2 /*return*/, Promise.resolve([])];
                }
            });
        });
    };
    /**
     * Plays multiple animations with a delay between each animation start.
     *
     * @param animations the animations to play
     * @param delay the delay (in ms)
     * @returns a promise for all animations.
     */
    AnimationManager.prototype.playWithDelay = function (animations, delay) {
        return __awaiter(this, void 0, void 0, function () {
            var promise;
            var _this = this;
            return __generator(this, function (_a) {
                promise = new Promise(function (success) {
                    var promises = [];
                    var _loop_1 = function (i) {
                        setTimeout(function () {
                            promises.push(_this.play(animations[i]));
                            if (i == animations.length - 1) {
                                Promise.all(promises).then(function (result) {
                                    success(result);
                                });
                            }
                        }, i * delay);
                    };
                    for (var i = 0; i < animations.length; i++) {
                        _loop_1(i);
                    }
                });
                return [2 /*return*/, promise];
            });
        });
    };
    /**
     * Attach an element to a parent, then play animation from element's origin to its new position.
     *
     * @param animation the animation function
     * @param attachElement the destination parent
     * @returns a promise when animation ends
     */
    AnimationManager.prototype.attachWithAnimation = function (animation, attachElement) {
        var attachWithAnimation = new BgaAttachWithAnimation({
            animation: animation,
            attachElement: attachElement
        });
        return this.play(attachWithAnimation);
    };
    return AnimationManager;
}());
/**
 * The abstract stock. It shouldn't be used directly, use stocks that extends it.
 */
var CardStock = /** @class */ (function () {
    /**
     * @param manager the card manager
     * @param element the stock element (should be an empty HTML Element)
     */
    function CardStock(manager, element, settings) {
        this.manager = manager;
        this.element = element;
        this.settings = settings;
        this.cards = [];
        this.selectedCards = [];
        this.selectionMode = 'none';
        manager.addStock(this);
        element === null || element === void 0 ? void 0 : element.classList.add('card-stock' /*, this.constructor.name.split(/(?=[A-Z])/).join('-').toLowerCase()* doesn't work in production because of minification */);
        this.bindClick();
        this.sort = settings === null || settings === void 0 ? void 0 : settings.sort;
    }
    /**
     * @returns the cards on the stock
     */
    CardStock.prototype.getCards = function () {
        return this.cards.slice();
    };
    /**
     * @returns if the stock is empty
     */
    CardStock.prototype.isEmpty = function () {
        return !this.cards.length;
    };
    /**
     * @returns the selected cards
     */
    CardStock.prototype.getSelection = function () {
        return this.selectedCards.slice();
    };
    /**
     * @returns the selected cards
     */
    CardStock.prototype.isSelected = function (card) {
        var _this = this;
        return this.selectedCards.some(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
    };
    /**
     * @param card a card
     * @returns if the card is present in the stock
     */
    CardStock.prototype.contains = function (card) {
        var _this = this;
        return this.cards.some(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
    };
    /**
     * @param card a card in the stock
     * @returns the HTML element generated for the card
     */
    CardStock.prototype.getCardElement = function (card) {
        return this.manager.getCardElement(card);
    };
    /**
     * Checks if the card can be added. By default, only if it isn't already present in the stock.
     *
     * @param card the card to add
     * @param settings the addCard settings
     * @returns if the card can be added
     */
    CardStock.prototype.canAddCard = function (card, settings) {
        return !this.contains(card);
    };
    /**
     * Add a card to the stock.
     *
     * @param card the card to add
     * @param animation a `CardAnimation` object
     * @param settings a `AddCardSettings` object
     * @returns the promise when the animation is done (true if it was animated, false if it wasn't)
     */
    CardStock.prototype.addCard = function (card, animation, settings) {
        var _this = this;
        var _a, _b, _c;
        if (!this.canAddCard(card, settings)) {
            return Promise.resolve(false);
        }
        var promise;
        // we check if card is in a stock
        var originStock = this.manager.getCardStock(card);
        var index = this.getNewCardIndex(card);
        var settingsWithIndex = __assign({ index: index }, (settings !== null && settings !== void 0 ? settings : {}));
        var updateInformations = (_a = settingsWithIndex.updateInformations) !== null && _a !== void 0 ? _a : true;
        if (originStock === null || originStock === void 0 ? void 0 : originStock.contains(card)) {
            var element = this.getCardElement(card);
            promise = this.moveFromOtherStock(card, element, __assign(__assign({}, animation), { fromStock: originStock }), settingsWithIndex);
            if (!updateInformations) {
                element.dataset.side = ((_b = settingsWithIndex === null || settingsWithIndex === void 0 ? void 0 : settingsWithIndex.visible) !== null && _b !== void 0 ? _b : this.manager.isCardVisible(card)) ? 'front' : 'back';
            }
        }
        else if ((animation === null || animation === void 0 ? void 0 : animation.fromStock) && animation.fromStock.contains(card)) {
            var element = this.getCardElement(card);
            promise = this.moveFromOtherStock(card, element, animation, settingsWithIndex);
        }
        else {
            var element = this.manager.createCardElement(card, ((_c = settingsWithIndex === null || settingsWithIndex === void 0 ? void 0 : settingsWithIndex.visible) !== null && _c !== void 0 ? _c : this.manager.isCardVisible(card)));
            promise = this.moveFromElement(card, element, animation, settingsWithIndex);
        }
        if (settingsWithIndex.index !== null && settingsWithIndex.index !== undefined) {
            this.cards.splice(index, 0, card);
        }
        else {
            this.cards.push(card);
        }
        if (updateInformations) { // after splice/push
            this.manager.updateCardInformations(card);
        }
        if (!promise) {
            console.warn("CardStock.addCard didn't return a Promise");
            promise = Promise.resolve(false);
        }
        if (this.selectionMode !== 'none') {
            // make selectable only at the end of the animation
            promise.then(function () { var _a; return _this.setSelectableCard(card, (_a = settingsWithIndex.selectable) !== null && _a !== void 0 ? _a : true); });
        }
        return promise;
    };
    CardStock.prototype.getNewCardIndex = function (card) {
        if (this.sort) {
            var otherCards = this.getCards();
            for (var i = 0; i < otherCards.length; i++) {
                var otherCard = otherCards[i];
                if (this.sort(card, otherCard) < 0) {
                    return i;
                }
            }
            return otherCards.length;
        }
        else {
            return undefined;
        }
    };
    CardStock.prototype.addCardElementToParent = function (cardElement, settings) {
        var _a;
        var parent = (_a = settings === null || settings === void 0 ? void 0 : settings.forceToElement) !== null && _a !== void 0 ? _a : this.element;
        if ((settings === null || settings === void 0 ? void 0 : settings.index) === null || (settings === null || settings === void 0 ? void 0 : settings.index) === undefined || !parent.children.length || (settings === null || settings === void 0 ? void 0 : settings.index) >= parent.children.length) {
            parent.appendChild(cardElement);
        }
        else {
            parent.insertBefore(cardElement, parent.children[settings.index]);
        }
    };
    CardStock.prototype.moveFromOtherStock = function (card, cardElement, animation, settings) {
        var promise;
        var element = animation.fromStock.contains(card) ? this.manager.getCardElement(card) : animation.fromStock.element;
        var fromRect = element.getBoundingClientRect();
        this.addCardElementToParent(cardElement, settings);
        this.removeSelectionClassesFromElement(cardElement);
        promise = this.animationFromElement(cardElement, fromRect, {
            originalSide: animation.originalSide,
            rotationDelta: animation.rotationDelta,
            animation: animation.animation,
        });
        // in the case the card was move inside the same stock we don't remove it
        if (animation.fromStock && animation.fromStock != this) {
            animation.fromStock.removeCard(card);
        }
        if (!promise) {
            console.warn("CardStock.moveFromOtherStock didn't return a Promise");
            promise = Promise.resolve(false);
        }
        return promise;
    };
    CardStock.prototype.moveFromElement = function (card, cardElement, animation, settings) {
        var promise;
        this.addCardElementToParent(cardElement, settings);
        if (animation) {
            if (animation.fromStock) {
                promise = this.animationFromElement(cardElement, animation.fromStock.element.getBoundingClientRect(), {
                    originalSide: animation.originalSide,
                    rotationDelta: animation.rotationDelta,
                    animation: animation.animation,
                });
                animation.fromStock.removeCard(card);
            }
            else if (animation.fromElement) {
                promise = this.animationFromElement(cardElement, animation.fromElement.getBoundingClientRect(), {
                    originalSide: animation.originalSide,
                    rotationDelta: animation.rotationDelta,
                    animation: animation.animation,
                });
            }
        }
        else {
            promise = Promise.resolve(false);
        }
        if (!promise) {
            console.warn("CardStock.moveFromElement didn't return a Promise");
            promise = Promise.resolve(false);
        }
        return promise;
    };
    /**
     * Add an array of cards to the stock.
     *
     * @param cards the cards to add
     * @param animation a `CardAnimation` object
     * @param settings a `AddCardSettings` object
     * @param shift if number, the number of milliseconds between each card. if true, chain animations
     */
    CardStock.prototype.addCards = function (cards_1, animation_1, settings_1) {
        return __awaiter(this, arguments, void 0, function (cards, animation, settings, shift) {
            var promises, result, others, _loop_2, i, results;
            var _this = this;
            if (shift === void 0) { shift = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.manager.animationsActive()) {
                            shift = false;
                        }
                        promises = [];
                        if (!(shift === true)) return [3 /*break*/, 4];
                        if (!cards.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.addCard(cards[0], animation, settings)];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, this.addCards(cards.slice(1), animation, settings, shift)];
                    case 2:
                        others = _a.sent();
                        return [2 /*return*/, result || others];
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        if (typeof shift === 'number') {
                            _loop_2 = function (i) {
                                setTimeout(function () { return promises.push(_this.addCard(cards[i], animation, settings)); }, i * shift);
                            };
                            for (i = 0; i < cards.length; i++) {
                                _loop_2(i);
                            }
                        }
                        else {
                            promises = cards.map(function (card) { return _this.addCard(card, animation, settings); });
                        }
                        _a.label = 5;
                    case 5: return [4 /*yield*/, Promise.all(promises)];
                    case 6:
                        results = _a.sent();
                        return [2 /*return*/, results.some(function (result) { return result; })];
                }
            });
        });
    };
    /**
     * Remove a card from the stock.
     *
     * @param card the card to remove
     * @param settings a `RemoveCardSettings` object
     */
    CardStock.prototype.removeCard = function (card, settings) {
        var promise;
        if (this.contains(card) && this.element.contains(this.getCardElement(card))) {
            promise = this.manager.removeCard(card, settings);
        }
        else {
            promise = Promise.resolve(false);
        }
        this.cardRemoved(card, settings);
        return promise;
    };
    /**
     * Notify the stock that a card is removed.
     *
     * @param card the card to remove
     * @param settings a `RemoveCardSettings` object
     */
    CardStock.prototype.cardRemoved = function (card, settings) {
        var _this = this;
        var index = this.cards.findIndex(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
        if (index !== -1) {
            this.cards.splice(index, 1);
        }
        if (this.selectedCards.find(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); })) {
            this.unselectCard(card);
        }
    };
    /**
     * Remove a set of card from the stock.
     *
     * @param cards the cards to remove
     * @param settings a `RemoveCardSettings` object
     */
    CardStock.prototype.removeCards = function (cards, settings) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = cards.map(function (card) { return _this.removeCard(card, settings); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.some(function (result) { return result; })];
                }
            });
        });
    };
    /**
     * Remove all cards from the stock.
     * @param settings a `RemoveCardSettings` object
     */
    CardStock.prototype.removeAll = function (settings) {
        var _this = this;
        var cards = this.getCards(); // use a copy of the array as we iterate and modify it at the same time
        cards.forEach(function (card) { return _this.removeCard(card, settings); });
    };
    /**
     * Set if the stock is selectable, and if yes if it can be multiple.
     * If set to 'none', it will unselect all selected cards.
     *
     * @param selectionMode the selection mode
     * @param selectableCards the selectable cards (all if unset). Calls `setSelectableCards` method
     */
    CardStock.prototype.setSelectionMode = function (selectionMode, selectableCards) {
        var _this = this;
        if (selectionMode !== this.selectionMode) {
            this.unselectAll(true);
        }
        this.cards.forEach(function (card) { return _this.setSelectableCard(card, selectionMode != 'none'); });
        this.element.classList.toggle('bga-cards_selectable-stock', selectionMode != 'none');
        this.selectionMode = selectionMode;
        if (selectionMode === 'none') {
            this.getCards().forEach(function (card) { return _this.removeSelectionClasses(card); });
        }
        else {
            this.setSelectableCards(selectableCards !== null && selectableCards !== void 0 ? selectableCards : this.getCards());
        }
    };
    CardStock.prototype.setSelectableCard = function (card, selectable) {
        if (this.selectionMode === 'none') {
            return;
        }
        var element = this.getCardElement(card);
        var selectableCardsClass = this.getSelectableCardClass();
        var unselectableCardsClass = this.getUnselectableCardClass();
        if (selectableCardsClass) {
            element === null || element === void 0 ? void 0 : element.classList.toggle(selectableCardsClass, selectable);
        }
        if (unselectableCardsClass) {
            element === null || element === void 0 ? void 0 : element.classList.toggle(unselectableCardsClass, !selectable);
        }
        if (!selectable && this.isSelected(card)) {
            this.unselectCard(card, true);
        }
    };
    /**
     * Set the selectable class for each card.
     *
     * @param selectableCards the selectable cards. If unset, all cards are marked selectable. Default unset.
     */
    CardStock.prototype.setSelectableCards = function (selectableCards) {
        var _this = this;
        if (this.selectionMode === 'none') {
            return;
        }
        var selectableCardsIds = (selectableCards !== null && selectableCards !== void 0 ? selectableCards : this.getCards()).map(function (card) { return _this.manager.getId(card); });
        this.cards.forEach(function (card) {
            return _this.setSelectableCard(card, selectableCardsIds.includes(_this.manager.getId(card)));
        });
    };
    /**
     * Set selected state to a card.
     *
     * @param card the card to select
     */
    CardStock.prototype.selectCard = function (card, silent) {
        var _this = this;
        var _a;
        if (silent === void 0) { silent = false; }
        if (this.selectionMode == 'none') {
            return;
        }
        var element = this.getCardElement(card);
        var selectableCardsClass = this.getSelectableCardClass();
        if (!element || !element.classList.contains(selectableCardsClass)) {
            return;
        }
        if (this.selectionMode === 'single') {
            this.cards.filter(function (c) { return _this.manager.getId(c) != _this.manager.getId(card); }).forEach(function (c) { return _this.unselectCard(c, true); });
        }
        var selectedCardsClass = this.getSelectedCardClass();
        element.classList.add(selectedCardsClass);
        this.selectedCards.push(card);
        if (!silent) {
            (_a = this.onSelectionChange) === null || _a === void 0 ? void 0 : _a.call(this, this.selectedCards.slice(), card);
        }
    };
    /**
     * Set unselected state to a card.
     *
     * @param card the card to unselect
     */
    CardStock.prototype.unselectCard = function (card, silent) {
        var _this = this;
        var _a;
        if (silent === void 0) { silent = false; }
        var element = this.getCardElement(card);
        var selectedCardsClass = this.getSelectedCardClass();
        element === null || element === void 0 ? void 0 : element.classList.remove(selectedCardsClass);
        var index = this.selectedCards.findIndex(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
        if (index !== -1) {
            this.selectedCards.splice(index, 1);
        }
        if (!silent) {
            (_a = this.onSelectionChange) === null || _a === void 0 ? void 0 : _a.call(this, this.selectedCards.slice(), card);
        }
    };
    /**
     * Select all cards
     */
    CardStock.prototype.selectAll = function (silent) {
        var _this = this;
        var _a;
        if (silent === void 0) { silent = false; }
        if (this.selectionMode == 'none') {
            return;
        }
        this.cards.forEach(function (c) { return _this.selectCard(c, true); });
        if (!silent) {
            (_a = this.onSelectionChange) === null || _a === void 0 ? void 0 : _a.call(this, this.selectedCards.slice(), null);
        }
    };
    /**
     * Unelect all cards
     */
    CardStock.prototype.unselectAll = function (silent) {
        var _this = this;
        var _a;
        if (silent === void 0) { silent = false; }
        var cards = this.getCards(); // use a copy of the array as we iterate and modify it at the same time
        cards.forEach(function (c) { return _this.unselectCard(c, true); });
        if (!silent) {
            (_a = this.onSelectionChange) === null || _a === void 0 ? void 0 : _a.call(this, this.selectedCards.slice(), null);
        }
    };
    CardStock.prototype.bindClick = function () {
        var _this = this;
        var _a;
        (_a = this.element) === null || _a === void 0 ? void 0 : _a.addEventListener('click', function (event) {
            var cardDiv = event.target.closest('.card');
            if (!cardDiv) {
                return;
            }
            var card = _this.cards.find(function (c) { return _this.manager.getId(c) == cardDiv.id; });
            if (!card) {
                return;
            }
            _this.cardClick(card);
        });
    };
    CardStock.prototype.cardClick = function (card) {
        var _this = this;
        var _a;
        if (this.selectionMode != 'none') {
            var alreadySelected = this.selectedCards.some(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
            if (alreadySelected) {
                this.unselectCard(card);
            }
            else {
                this.selectCard(card);
            }
        }
        (_a = this.onCardClick) === null || _a === void 0 ? void 0 : _a.call(this, card);
    };
    /**
     * @param element The element to animate. The element is added to the destination stock before the animation starts.
     * @param fromElement The HTMLElement to animate from.
     */
    CardStock.prototype.animationFromElement = function (element, fromRect, settings) {
        return __awaiter(this, void 0, void 0, function () {
            var side, cardSides_1, animation, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        side = element.dataset.side;
                        if (settings.originalSide && settings.originalSide != side) {
                            cardSides_1 = element.getElementsByClassName('card-sides')[0];
                            cardSides_1.style.transition = 'none';
                            element.dataset.side = settings.originalSide;
                            setTimeout(function () {
                                cardSides_1.style.transition = null;
                                element.dataset.side = side;
                            });
                        }
                        animation = settings.animation;
                        if (animation) {
                            animation.settings.element = element;
                            animation.settings.fromRect = fromRect;
                        }
                        else {
                            animation = new BgaSlideAnimation({ element: element, fromRect: fromRect });
                        }
                        return [4 /*yield*/, this.manager.animationManager.play(animation)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, (_a = result === null || result === void 0 ? void 0 : result.played) !== null && _a !== void 0 ? _a : false];
                }
            });
        });
    };
    /**
     * Set the card to its front (visible) or back (not visible) side.
     *
     * @param card the card informations
     */
    CardStock.prototype.setCardVisible = function (card, visible, settings) {
        this.manager.setCardVisible(card, visible, settings);
    };
    /**
     * Flips the card.
     *
     * @param card the card informations
     */
    CardStock.prototype.flipCard = function (card, settings) {
        this.manager.flipCard(card, settings);
    };
    /**
     * @returns the class to apply to selectable cards. Use class from manager is unset.
     */
    CardStock.prototype.getSelectableCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.selectableCardClass) === undefined ? this.manager.getSelectableCardClass() : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.selectableCardClass;
    };
    /**
     * @returns the class to apply to selectable cards. Use class from manager is unset.
     */
    CardStock.prototype.getUnselectableCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.unselectableCardClass) === undefined ? this.manager.getUnselectableCardClass() : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.unselectableCardClass;
    };
    /**
     * @returns the class to apply to selected cards. Use class from manager is unset.
     */
    CardStock.prototype.getSelectedCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.selectedCardClass) === undefined ? this.manager.getSelectedCardClass() : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.selectedCardClass;
    };
    CardStock.prototype.removeSelectionClasses = function (card) {
        this.removeSelectionClassesFromElement(this.getCardElement(card));
    };
    CardStock.prototype.removeSelectionClassesFromElement = function (cardElement) {
        var selectableCardsClass = this.getSelectableCardClass();
        var unselectableCardsClass = this.getUnselectableCardClass();
        var selectedCardsClass = this.getSelectedCardClass();
        cardElement === null || cardElement === void 0 ? void 0 : cardElement.classList.remove(selectableCardsClass, unselectableCardsClass, selectedCardsClass);
    };
    return CardStock;
}());
var SlideAndBackAnimation = /** @class */ (function (_super) {
    __extends(SlideAndBackAnimation, _super);
    function SlideAndBackAnimation(manager, element, tempElement) {
        var distance = (manager.getCardWidth() + manager.getCardHeight()) / 2;
        var angle = Math.random() * Math.PI * 2;
        var fromDelta = {
            x: distance * Math.cos(angle),
            y: distance * Math.sin(angle),
        };
        return _super.call(this, {
            animations: [
                new BgaSlideToAnimation({ element: element, fromDelta: fromDelta, duration: 250 }),
                new BgaSlideAnimation({ element: element, fromDelta: fromDelta, duration: 250, animationEnd: tempElement ? (function () { return element.remove(); }) : undefined }),
            ]
        }) || this;
    }
    return SlideAndBackAnimation;
}(BgaCumulatedAnimation));
/**
 * Abstract stock to represent a deck. (pile of cards, with a fake 3d effect of thickness). *
 * Needs cardWidth and cardHeight to be set in the card manager.
 */
var Deck = /** @class */ (function (_super) {
    __extends(Deck, _super);
    function Deck(manager, element, settings) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        var _this = _super.call(this, manager, element) || this;
        _this.manager = manager;
        _this.element = element;
        element.classList.add('deck');
        var cardWidth = _this.manager.getCardWidth();
        var cardHeight = _this.manager.getCardHeight();
        if (cardWidth && cardHeight) {
            _this.element.style.setProperty('--width', "".concat(cardWidth, "px"));
            _this.element.style.setProperty('--height', "".concat(cardHeight, "px"));
        }
        else {
            throw new Error("You need to set cardWidth and cardHeight in the card manager to use Deck.");
        }
        _this.thicknesses = (_a = settings.thicknesses) !== null && _a !== void 0 ? _a : [0, 2, 5, 10, 20, 30];
        _this.setCardNumber((_b = settings.cardNumber) !== null && _b !== void 0 ? _b : 52);
        _this.autoUpdateCardNumber = (_c = settings.autoUpdateCardNumber) !== null && _c !== void 0 ? _c : true;
        _this.autoRemovePreviousCards = (_d = settings.autoRemovePreviousCards) !== null && _d !== void 0 ? _d : true;
        var shadowDirection = (_e = settings.shadowDirection) !== null && _e !== void 0 ? _e : 'bottom-right';
        var shadowDirectionSplit = shadowDirection.split('-');
        var xShadowShift = shadowDirectionSplit.includes('right') ? 1 : (shadowDirectionSplit.includes('left') ? -1 : 0);
        var yShadowShift = shadowDirectionSplit.includes('bottom') ? 1 : (shadowDirectionSplit.includes('top') ? -1 : 0);
        _this.element.style.setProperty('--xShadowShift', '' + xShadowShift);
        _this.element.style.setProperty('--yShadowShift', '' + yShadowShift);
        if (settings.topCard) {
            _this.addCard(settings.topCard, undefined);
        }
        else if (settings.cardNumber > 0) {
            console.warn("Deck is defined with ".concat(settings.cardNumber, " cards but no top card !"));
        }
        if (settings.counter && ((_f = settings.counter.show) !== null && _f !== void 0 ? _f : true)) {
            if (settings.cardNumber === null || settings.cardNumber === undefined) {
                throw new Error("You need to set cardNumber if you want to show the counter");
            }
            else {
                _this.createCounter((_g = settings.counter.position) !== null && _g !== void 0 ? _g : 'bottom', (_h = settings.counter.extraClasses) !== null && _h !== void 0 ? _h : 'round', settings.counter.counterId);
                if ((_j = settings.counter) === null || _j === void 0 ? void 0 : _j.hideWhenEmpty) {
                    _this.element.querySelector('.bga-cards_deck-counter').classList.add('hide-when-empty');
                }
            }
        }
        _this.setCardNumber((_k = settings.cardNumber) !== null && _k !== void 0 ? _k : 52);
        return _this;
    }
    Deck.prototype.createCounter = function (counterPosition, extraClasses, counterId) {
        var left = counterPosition.includes('right') ? 100 : (counterPosition.includes('left') ? 0 : 50);
        var top = counterPosition.includes('bottom') ? 100 : (counterPosition.includes('top') ? 0 : 50);
        this.element.style.setProperty('--bga-cards-deck-left', "".concat(left, "%"));
        this.element.style.setProperty('--bga-cards-deck-top', "".concat(top, "%"));
        this.element.insertAdjacentHTML('beforeend', "\n            <div ".concat(counterId ? "id=\"".concat(counterId, "\"") : '', " class=\"bga-cards_deck-counter ").concat(extraClasses, "\"></div>\n        "));
    };
    /**
     * Get the the cards number.
     *
     * @returns the cards number
     */
    Deck.prototype.getCardNumber = function () {
        return this.cardNumber;
    };
    /**
     * Set the the cards number.
     *
     * @param cardNumber the cards number
     */
    Deck.prototype.setCardNumber = function (cardNumber, topCard) {
        var _this = this;
        if (topCard === void 0) { topCard = null; }
        var promise = topCard ? this.addCard(topCard) : Promise.resolve(true);
        this.cardNumber = cardNumber;
        this.element.dataset.empty = (this.cardNumber == 0).toString();
        var thickness = 0;
        this.thicknesses.forEach(function (threshold, index) {
            if (_this.cardNumber >= threshold) {
                thickness = index;
            }
        });
        this.element.style.setProperty('--thickness', "".concat(thickness, "px"));
        var counterDiv = this.element.querySelector('.bga-cards_deck-counter');
        if (counterDiv) {
            counterDiv.innerHTML = "".concat(cardNumber);
        }
        return promise;
    };
    Deck.prototype.addCard = function (card, animation, settings) {
        var _this = this;
        var _a, _b;
        if ((_a = settings === null || settings === void 0 ? void 0 : settings.autoUpdateCardNumber) !== null && _a !== void 0 ? _a : this.autoUpdateCardNumber) {
            this.setCardNumber(this.cardNumber + 1);
        }
        var promise = _super.prototype.addCard.call(this, card, animation, settings);
        if ((_b = settings === null || settings === void 0 ? void 0 : settings.autoRemovePreviousCards) !== null && _b !== void 0 ? _b : this.autoRemovePreviousCards) {
            promise.then(function () {
                var previousCards = _this.getCards().slice(0, -1); // remove last cards
                _this.removeCards(previousCards, { autoUpdateCardNumber: false });
            });
        }
        return promise;
    };
    Deck.prototype.cardRemoved = function (card, settings) {
        var _a;
        if ((_a = settings === null || settings === void 0 ? void 0 : settings.autoUpdateCardNumber) !== null && _a !== void 0 ? _a : this.autoUpdateCardNumber) {
            this.setCardNumber(this.cardNumber - 1);
        }
        _super.prototype.cardRemoved.call(this, card, settings);
    };
    Deck.prototype.getTopCard = function () {
        var cards = this.getCards();
        return cards.length ? cards[cards.length - 1] : null;
    };
    /**
     * Shows a shuffle animation on the deck
     *
     * @param animatedCardsMax number of animated cards for shuffle animation.
     * @param fakeCardSetter a function to generate a fake card for animation. Required if the card id is not based on a numerci `id` field, or if you want to set custom card back
     * @returns promise when animation ends
     */
    Deck.prototype.shuffle = function () {
        return __awaiter(this, arguments, void 0, function (animatedCardsMax, fakeCardSetter) {
            var animatedCards, elements, i, newCard, newElement;
            var _this = this;
            if (animatedCardsMax === void 0) { animatedCardsMax = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.manager.animationsActive()) {
                            return [2 /*return*/, Promise.resolve(false)]; // we don't execute as it's just visual temporary stuff
                        }
                        animatedCards = Math.min(10, animatedCardsMax, this.getCardNumber());
                        if (!(animatedCards > 1)) return [3 /*break*/, 2];
                        elements = [this.getCardElement(this.getTopCard())];
                        for (i = elements.length; i <= animatedCards; i++) {
                            newCard = {};
                            if (fakeCardSetter) {
                                fakeCardSetter(newCard, i);
                            }
                            else {
                                newCard.id = -100000 + i;
                            }
                            newElement = this.manager.createCardElement(newCard, false);
                            newElement.dataset.tempCardForShuffleAnimation = 'true';
                            this.element.prepend(newElement);
                            elements.push(newElement);
                        }
                        return [4 /*yield*/, this.manager.animationManager.playWithDelay(elements.map(function (element) { return new SlideAndBackAnimation(_this.manager, element, element.dataset.tempCardForShuffleAnimation == 'true'); }), 50)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2: return [2 /*return*/, Promise.resolve(false)];
                }
            });
        });
    };
    return Deck;
}(CardStock));
/**
 * A basic stock for a list of cards, based on flex.
 */
var LineStock = /** @class */ (function (_super) {
    __extends(LineStock, _super);
    /**
     * @param manager the card manager
     * @param element the stock element (should be an empty HTML Element)
     * @param settings a `LineStockSettings` object
     */
    function LineStock(manager, element, settings) {
        var _a, _b, _c, _d;
        var _this = _super.call(this, manager, element, settings) || this;
        _this.manager = manager;
        _this.element = element;
        element.classList.add('line-stock');
        element.dataset.center = ((_a = settings === null || settings === void 0 ? void 0 : settings.center) !== null && _a !== void 0 ? _a : true).toString();
        element.style.setProperty('--wrap', (_b = settings === null || settings === void 0 ? void 0 : settings.wrap) !== null && _b !== void 0 ? _b : 'wrap');
        element.style.setProperty('--direction', (_c = settings === null || settings === void 0 ? void 0 : settings.direction) !== null && _c !== void 0 ? _c : 'row');
        element.style.setProperty('--gap', (_d = settings === null || settings === void 0 ? void 0 : settings.gap) !== null && _d !== void 0 ? _d : '8px');
        return _this;
    }
    return LineStock;
}(CardStock));
/**
 * A stock with fixed slots (some can be empty)
 */
var SlotStock = /** @class */ (function (_super) {
    __extends(SlotStock, _super);
    /**
     * @param manager the card manager
     * @param element the stock element (should be an empty HTML Element)
     * @param settings a `SlotStockSettings` object
     */
    function SlotStock(manager, element, settings) {
        var _a, _b;
        var _this = _super.call(this, manager, element, settings) || this;
        _this.manager = manager;
        _this.element = element;
        _this.slotsIds = [];
        _this.slots = [];
        element.classList.add('slot-stock');
        _this.mapCardToSlot = settings.mapCardToSlot;
        _this.slotsIds = (_a = settings.slotsIds) !== null && _a !== void 0 ? _a : [];
        _this.slotClasses = (_b = settings.slotClasses) !== null && _b !== void 0 ? _b : [];
        _this.slotsIds.forEach(function (slotId) {
            _this.createSlot(slotId);
        });
        return _this;
    }
    SlotStock.prototype.createSlot = function (slotId) {
        var _a;
        this.slots[slotId] = document.createElement("div");
        this.slots[slotId].dataset.slotId = slotId;
        this.element.appendChild(this.slots[slotId]);
        (_a = this.slots[slotId].classList).add.apply(_a, __spreadArray(['slot'], this.slotClasses, true));
    };
    /**
     * Add a card to the stock.
     *
     * @param card the card to add
     * @param animation a `CardAnimation` object
     * @param settings a `AddCardToSlotSettings` object
     * @returns the promise when the animation is done (true if it was animated, false if it wasn't)
     */
    SlotStock.prototype.addCard = function (card, animation, settings) {
        var _a, _b;
        var slotId = (_a = settings === null || settings === void 0 ? void 0 : settings.slot) !== null && _a !== void 0 ? _a : (_b = this.mapCardToSlot) === null || _b === void 0 ? void 0 : _b.call(this, card);
        if (slotId === undefined) {
            throw new Error("Impossible to add card to slot : no SlotId. Add slotId to settings or set mapCardToSlot to SlotCard constructor.");
        }
        if (!this.slots[slotId]) {
            throw new Error("Impossible to add card to slot \"".concat(slotId, "\" : slot \"").concat(slotId, "\" doesn't exists."));
        }
        var newSettings = __assign(__assign({}, settings), { forceToElement: this.slots[slotId] });
        return _super.prototype.addCard.call(this, card, animation, newSettings);
    };
    /**
     * Change the slots ids. Will empty the stock before re-creating the slots.
     *
     * @param slotsIds the new slotsIds. Will replace the old ones.
     */
    SlotStock.prototype.setSlotsIds = function (slotsIds) {
        var _this = this;
        if (slotsIds.length == this.slotsIds.length && slotsIds.every(function (slotId, index) { return _this.slotsIds[index] === slotId; })) {
            // no change
            return;
        }
        this.removeAll();
        this.element.innerHTML = '';
        this.slotsIds = slotsIds !== null && slotsIds !== void 0 ? slotsIds : [];
        this.slotsIds.forEach(function (slotId) {
            _this.createSlot(slotId);
        });
    };
    /**
     * Add new slots ids. Will not change nor empty the existing ones.
     *
     * @param slotsIds the new slotsIds. Will be merged with the old ones.
     */
    SlotStock.prototype.addSlotsIds = function (newSlotsIds) {
        var _a;
        var _this = this;
        if (newSlotsIds.length == 0) {
            // no change
            return;
        }
        (_a = this.slotsIds).push.apply(_a, newSlotsIds);
        newSlotsIds.forEach(function (slotId) {
            _this.createSlot(slotId);
        });
    };
    SlotStock.prototype.canAddCard = function (card, settings) {
        var _a, _b;
        if (!this.contains(card)) {
            return true;
        }
        else {
            var currentCardSlot = this.getCardElement(card).closest('.slot').dataset.slotId;
            var slotId = (_a = settings === null || settings === void 0 ? void 0 : settings.slot) !== null && _a !== void 0 ? _a : (_b = this.mapCardToSlot) === null || _b === void 0 ? void 0 : _b.call(this, card);
            return currentCardSlot != slotId;
        }
    };
    /**
     * Swap cards inside the slot stock.
     *
     * @param cards the cards to swap
     * @param settings for `updateInformations` and `selectable`
     */
    SlotStock.prototype.swapCards = function (cards, settings) {
        var _this = this;
        if (!this.mapCardToSlot) {
            throw new Error('You need to define SlotStock.mapCardToSlot to use SlotStock.swapCards');
        }
        var promises = [];
        var elements = cards.map(function (card) { return _this.manager.getCardElement(card); });
        var elementsRects = elements.map(function (element) { return element.getBoundingClientRect(); });
        var cssPositions = elements.map(function (element) { return element.style.position; });
        // we set to absolute so it doesn't mess with slide coordinates when 2 div are at the same place
        elements.forEach(function (element) { return element.style.position = 'absolute'; });
        cards.forEach(function (card, index) {
            var _a, _b;
            var cardElement = elements[index];
            var promise;
            var slotId = (_a = _this.mapCardToSlot) === null || _a === void 0 ? void 0 : _a.call(_this, card);
            _this.slots[slotId].appendChild(cardElement);
            cardElement.style.position = cssPositions[index];
            var cardIndex = _this.cards.findIndex(function (c) { return _this.manager.getId(c) == _this.manager.getId(card); });
            if (cardIndex !== -1) {
                _this.cards.splice(cardIndex, 1, card);
            }
            if ((_b = settings === null || settings === void 0 ? void 0 : settings.updateInformations) !== null && _b !== void 0 ? _b : true) { // after splice/push
                _this.manager.updateCardInformations(card);
            }
            _this.removeSelectionClassesFromElement(cardElement);
            promise = _this.animationFromElement(cardElement, elementsRects[index], {});
            if (!promise) {
                console.warn("CardStock.animationFromElement didn't return a Promise");
                promise = Promise.resolve(false);
            }
            promise.then(function () { var _a; return _this.setSelectableCard(card, (_a = settings === null || settings === void 0 ? void 0 : settings.selectable) !== null && _a !== void 0 ? _a : true); });
            promises.push(promise);
        });
        return Promise.all(promises);
    };
    return SlotStock;
}(LineStock));
/**
 * A stock to make cards disappear (to automatically remove discarded cards, or to represent a bag)
 */
var VoidStock = /** @class */ (function (_super) {
    __extends(VoidStock, _super);
    /**
     * @param manager the card manager
     * @param element the stock element (should be an empty HTML Element)
     */
    function VoidStock(manager, element) {
        var _this = _super.call(this, manager, element) || this;
        _this.manager = manager;
        _this.element = element;
        element.classList.add('void-stock');
        return _this;
    }
    /**
     * Add a card to the stock.
     *
     * @param card the card to add
     * @param animation a `CardAnimation` object
     * @param settings a `AddCardToVoidStockSettings` object
     * @returns the promise when the animation is done (true if it was animated, false if it wasn't)
     */
    VoidStock.prototype.addCard = function (card, animation, settings) {
        var _this = this;
        var _a;
        var promise = _super.prototype.addCard.call(this, card, animation, settings);
        // center the element
        var cardElement = this.getCardElement(card);
        var originalLeft = cardElement.style.left;
        var originalTop = cardElement.style.top;
        cardElement.style.left = "".concat((this.element.clientWidth - cardElement.clientWidth) / 2, "px");
        cardElement.style.top = "".concat((this.element.clientHeight - cardElement.clientHeight) / 2, "px");
        if (!promise) {
            console.warn("VoidStock.addCard didn't return a Promise");
            promise = Promise.resolve(false);
        }
        if ((_a = settings === null || settings === void 0 ? void 0 : settings.remove) !== null && _a !== void 0 ? _a : true) {
            return promise.then(function () {
                return _this.removeCard(card);
            });
        }
        else {
            cardElement.style.left = originalLeft;
            cardElement.style.top = originalTop;
            return promise;
        }
    };
    return VoidStock;
}(CardStock));
function sortFunction() {
    var sortedFields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sortedFields[_i] = arguments[_i];
    }
    return function (a, b) {
        for (var i = 0; i < sortedFields.length; i++) {
            var direction = 1;
            var field = sortedFields[i];
            if (field[0] == '-') {
                direction = -1;
                field = field.substring(1);
            }
            else if (field[0] == '+') {
                field = field.substring(1);
            }
            var type = typeof a[field];
            if (type === 'string') {
                var compare = a[field].localeCompare(b[field]);
                if (compare !== 0) {
                    return compare;
                }
            }
            else if (type === 'number') {
                var compare = (a[field] - b[field]) * direction;
                if (compare !== 0) {
                    return compare * direction;
                }
            }
        }
        return 0;
    };
}
var CardManager = /** @class */ (function () {
    /**
     * @param game the BGA game class, usually it will be `this`
     * @param settings: a `CardManagerSettings` object
     */
    function CardManager(game, settings) {
        var _a;
        this.game = game;
        this.settings = settings;
        this.stocks = [];
        this.updateMainTimeoutId = [];
        this.updateFrontTimeoutId = [];
        this.updateBackTimeoutId = [];
        this.animationManager = (_a = settings.animationManager) !== null && _a !== void 0 ? _a : new AnimationManager(game);
    }
    /**
     * Returns if the animations are active. Animation aren't active when the window is not visible (`document.visibilityState === 'hidden'`), or `game.instantaneousMode` is true.
     *
     * @returns if the animations are active.
     */
    CardManager.prototype.animationsActive = function () {
        return this.animationManager.animationsActive();
    };
    CardManager.prototype.addStock = function (stock) {
        this.stocks.push(stock);
    };
    /**
     * @param card the card informations
     * @return the id for a card
     */
    CardManager.prototype.getId = function (card) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.settings).getId) === null || _b === void 0 ? void 0 : _b.call(_a, card)) !== null && _c !== void 0 ? _c : "card-".concat(card.id);
    };
    CardManager.prototype.createCardElement = function (card, visible) {
        var _a, _b, _c, _d, _e, _f;
        if (visible === void 0) { visible = true; }
        var id = this.getId(card);
        var side = visible ? 'front' : 'back';
        if (this.getCardElement(card)) {
            throw new Error('This card already exists ' + JSON.stringify(card));
        }
        var element = document.createElement("div");
        element.id = id;
        element.dataset.side = '' + side;
        element.innerHTML = "\n            <div class=\"card-sides\">\n                <div id=\"".concat(id, "-front\" class=\"card-side front\">\n                </div>\n                <div id=\"").concat(id, "-back\" class=\"card-side back\">\n                </div>\n            </div>\n        ");
        element.classList.add('card');
        document.body.appendChild(element);
        (_b = (_a = this.settings).setupDiv) === null || _b === void 0 ? void 0 : _b.call(_a, card, element);
        (_d = (_c = this.settings).setupFrontDiv) === null || _d === void 0 ? void 0 : _d.call(_c, card, element.getElementsByClassName('front')[0]);
        (_f = (_e = this.settings).setupBackDiv) === null || _f === void 0 ? void 0 : _f.call(_e, card, element.getElementsByClassName('back')[0]);
        document.body.removeChild(element);
        return element;
    };
    /**
     * @param card the card informations
     * @return the HTML element of an existing card
     */
    CardManager.prototype.getCardElement = function (card) {
        return document.getElementById(this.getId(card));
    };
    /**
     * Remove a card.
     *
     * @param card the card to remove
     * @param settings a `RemoveCardSettings` object
     */
    CardManager.prototype.removeCard = function (card, settings) {
        var _a;
        var id = this.getId(card);
        var div = document.getElementById(id);
        if (!div) {
            return Promise.resolve(false);
        }
        div.id = "deleted".concat(id);
        div.remove();
        // if the card is in a stock, notify the stock about removal
        (_a = this.getCardStock(card)) === null || _a === void 0 ? void 0 : _a.cardRemoved(card, settings);
        return Promise.resolve(true);
    };
    /**
     * Returns the stock containing the card.
     *
     * @param card the card informations
     * @return the stock containing the card
     */
    CardManager.prototype.getCardStock = function (card) {
        return this.stocks.find(function (stock) { return stock.contains(card); });
    };
    /**
     * Return if the card passed as parameter is suppose to be visible or not.
     * Use `isCardVisible` from settings if set, else will check if `card.type` is defined
     *
     * @param card the card informations
     * @return the visiblility of the card (true means front side should be displayed)
     */
    CardManager.prototype.isCardVisible = function (card) {
        var _a, _b, _c, _d;
        return (_c = (_b = (_a = this.settings).isCardVisible) === null || _b === void 0 ? void 0 : _b.call(_a, card)) !== null && _c !== void 0 ? _c : ((_d = card.type) !== null && _d !== void 0 ? _d : false);
    };
    /**
     * Set the card to its front (visible) or back (not visible) side.
     *
     * @param card the card informations
     * @param visible if the card is set to visible face. If unset, will use isCardVisible(card)
     * @param settings the flip params (to update the card in current stock)
     */
    CardManager.prototype.setCardVisible = function (card, visible, settings) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        var element = this.getCardElement(card);
        if (!element) {
            return;
        }
        var isVisible = visible !== null && visible !== void 0 ? visible : this.isCardVisible(card);
        element.dataset.side = isVisible ? 'front' : 'back';
        var stringId = JSON.stringify(this.getId(card));
        if ((_a = settings === null || settings === void 0 ? void 0 : settings.updateMain) !== null && _a !== void 0 ? _a : false) {
            if (this.updateMainTimeoutId[stringId]) { // make sure there is not a delayed animation that will overwrite the last flip request
                clearTimeout(this.updateMainTimeoutId[stringId]);
                delete this.updateMainTimeoutId[stringId];
            }
            var updateMainDelay = (_b = settings === null || settings === void 0 ? void 0 : settings.updateMainDelay) !== null && _b !== void 0 ? _b : 0;
            if (isVisible && updateMainDelay > 0 && this.animationsActive()) {
                this.updateMainTimeoutId[stringId] = setTimeout(function () { var _a, _b; return (_b = (_a = _this.settings).setupDiv) === null || _b === void 0 ? void 0 : _b.call(_a, card, element); }, updateMainDelay);
            }
            else {
                (_d = (_c = this.settings).setupDiv) === null || _d === void 0 ? void 0 : _d.call(_c, card, element);
            }
        }
        if ((_e = settings === null || settings === void 0 ? void 0 : settings.updateFront) !== null && _e !== void 0 ? _e : true) {
            if (this.updateFrontTimeoutId[stringId]) { // make sure there is not a delayed animation that will overwrite the last flip request
                clearTimeout(this.updateFrontTimeoutId[stringId]);
                delete this.updateFrontTimeoutId[stringId];
            }
            var updateFrontDelay = (_f = settings === null || settings === void 0 ? void 0 : settings.updateFrontDelay) !== null && _f !== void 0 ? _f : 500;
            if (!isVisible && updateFrontDelay > 0 && this.animationsActive()) {
                this.updateFrontTimeoutId[stringId] = setTimeout(function () { var _a, _b; return (_b = (_a = _this.settings).setupFrontDiv) === null || _b === void 0 ? void 0 : _b.call(_a, card, element.getElementsByClassName('front')[0]); }, updateFrontDelay);
            }
            else {
                (_h = (_g = this.settings).setupFrontDiv) === null || _h === void 0 ? void 0 : _h.call(_g, card, element.getElementsByClassName('front')[0]);
            }
        }
        if ((_j = settings === null || settings === void 0 ? void 0 : settings.updateBack) !== null && _j !== void 0 ? _j : false) {
            if (this.updateBackTimeoutId[stringId]) { // make sure there is not a delayed animation that will overwrite the last flip request
                clearTimeout(this.updateBackTimeoutId[stringId]);
                delete this.updateBackTimeoutId[stringId];
            }
            var updateBackDelay = (_k = settings === null || settings === void 0 ? void 0 : settings.updateBackDelay) !== null && _k !== void 0 ? _k : 0;
            if (isVisible && updateBackDelay > 0 && this.animationsActive()) {
                this.updateBackTimeoutId[stringId] = setTimeout(function () { var _a, _b; return (_b = (_a = _this.settings).setupBackDiv) === null || _b === void 0 ? void 0 : _b.call(_a, card, element.getElementsByClassName('back')[0]); }, updateBackDelay);
            }
            else {
                (_m = (_l = this.settings).setupBackDiv) === null || _m === void 0 ? void 0 : _m.call(_l, card, element.getElementsByClassName('back')[0]);
            }
        }
        if ((_o = settings === null || settings === void 0 ? void 0 : settings.updateData) !== null && _o !== void 0 ? _o : true) {
            // card data has changed
            var stock = this.getCardStock(card);
            var cards = stock.getCards();
            var cardIndex = cards.findIndex(function (c) { return _this.getId(c) === _this.getId(card); });
            if (cardIndex !== -1) {
                stock.cards.splice(cardIndex, 1, card);
            }
        }
    };
    /**
     * Flips the card.
     *
     * @param card the card informations
     * @param settings the flip params (to update the card in current stock)
     */
    CardManager.prototype.flipCard = function (card, settings) {
        var element = this.getCardElement(card);
        var currentlyVisible = element.dataset.side === 'front';
        this.setCardVisible(card, !currentlyVisible, settings);
    };
    /**
     * Update the card informations. Used when a card with just an id (back shown) should be revealed, with all data needed to populate the front.
     *
     * @param card the card informations
     */
    CardManager.prototype.updateCardInformations = function (card, settings) {
        var newSettings = __assign(__assign({}, (settings !== null && settings !== void 0 ? settings : {})), { updateData: true });
        this.setCardVisible(card, undefined, newSettings);
    };
    /**
     * @returns the card with set in the settings (undefined if unset)
     */
    CardManager.prototype.getCardWidth = function () {
        var _a;
        return (_a = this.settings) === null || _a === void 0 ? void 0 : _a.cardWidth;
    };
    /**
     * @returns the card height set in the settings (undefined if unset)
     */
    CardManager.prototype.getCardHeight = function () {
        var _a;
        return (_a = this.settings) === null || _a === void 0 ? void 0 : _a.cardHeight;
    };
    /**
     * @returns the class to apply to selectable cards. Default 'bga-cards_selectable-card'.
     */
    CardManager.prototype.getSelectableCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.selectableCardClass) === undefined ? 'bga-cards_selectable-card' : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.selectableCardClass;
    };
    /**
     * @returns the class to apply to selectable cards. Default 'bga-cards_disabled-card'.
     */
    CardManager.prototype.getUnselectableCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.unselectableCardClass) === undefined ? 'bga-cards_disabled-card' : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.unselectableCardClass;
    };
    /**
     * @returns the class to apply to selected cards. Default 'bga-cards_selected-card'.
     */
    CardManager.prototype.getSelectedCardClass = function () {
        var _a, _b;
        return ((_a = this.settings) === null || _a === void 0 ? void 0 : _a.selectedCardClass) === undefined ? 'bga-cards_selected-card' : (_b = this.settings) === null || _b === void 0 ? void 0 : _b.selectedCardClass;
    };
    return CardManager;
}());
var AstronautsManager = /** @class */ (function () {
    function AstronautsManager(game) {
        this.game = game;
    }
    AstronautsManager.prototype.createAstronaut = function (astronaut) {
        var _this = this;
        var astronautDiv = document.createElement('div');
        astronautDiv.id = "astronaut-".concat(astronaut.id);
        astronautDiv.classList.add('astronaut');
        astronautDiv.dataset.id = "".concat(astronaut.id);
        astronautDiv.dataset.playerColor = this.game.getPlayer(astronaut.playerId).color;
        astronautDiv.dataset.workforce = "".concat(astronaut.workforce);
        astronautDiv.dataset.remainingWorkforce = "".concat(astronaut.remainingWorkforce);
        astronautDiv.addEventListener('click', function () {
            if (astronautDiv.classList.contains('selectable')) {
                _this.game.onAstronautClick(astronaut);
            }
        });
        var workforceDiv = document.createElement('div');
        workforceDiv.id = "".concat(astronautDiv.id, "-force");
        workforceDiv.classList.add('workforce');
        astronautDiv.appendChild(workforceDiv);
        return astronautDiv;
    };
    AstronautsManager.prototype.getAstronautDiv = function (astronaut) {
        return document.getElementById("astronaut-".concat(astronaut.id));
    };
    AstronautsManager.prototype.setSelectedAstronaut = function (selectedAstronaut) {
        document.querySelectorAll('.astronaut').forEach(function (astronaut) {
            return astronaut.classList.toggle('selected', (selectedAstronaut === null || selectedAstronaut === void 0 ? void 0 : selectedAstronaut.id) == Number(astronaut.dataset.id));
        });
    };
    AstronautsManager.prototype.moveAstronautDiv = function (astronaut) {
        var astronautDiv = this.getAstronautDiv(astronaut);
        if (astronaut.location == 'player') {
            var modulesDiv = document.getElementById("player-table-".concat(astronaut.playerId, "-modules"));
            this.game.getPlayerTable(astronaut.playerId).makeSlotForCoordinates(astronaut.x, astronaut.y);
            modulesDiv.querySelector("[data-slot-id=\"".concat(astronaut.x, "_").concat(astronaut.y, "\"]")).appendChild(astronautDiv);
        }
        else if (astronaut.location == 'table') {
            var tableAstronauts = document.getElementById('table-astronauts');
            tableAstronauts.querySelector(".slot[data-slot-id=\"".concat(astronaut.spot, "\"]")).appendChild(astronautDiv);
        }
    };
    AstronautsManager.prototype.resetAstronaut = function (astronaut) {
        this.moveAstronautDiv(astronaut);
        this.updateAstronaut(astronaut);
    };
    AstronautsManager.prototype.updateAstronaut = function (astronaut) {
        var div = this.getAstronautDiv(astronaut);
        div.dataset.remainingWorkforce = "".concat(astronaut.remainingWorkforce);
        div.dataset.workforce = "".concat(astronaut.workforce);
    };
    AstronautsManager.prototype.setAstronautToConfirm = function (astronaut, toConfirm) {
        this.getAstronautDiv(astronaut).classList.toggle('to-confirm', toConfirm);
    };
    return AstronautsManager;
}());
var ModulesManager = /** @class */ (function (_super) {
    __extends(ModulesManager, _super);
    function ModulesManager(game) {
        var _this = _super.call(this, game, {
            getId: function (card) { return "module-".concat(card.id); },
            setupDiv: function (card, div) {
                div.classList.add('module');
                div.dataset.type = '' + card.type;
                div.dataset.r = '' + card.r;
            },
            setupFrontDiv: function (card, div) { return _this.setupFrontDiv(card, div); },
            isCardVisible: function (card) { return Boolean(card.number) || [0, 8, 9].includes(card.type); },
            cardWidth: 150,
            cardHeight: 150,
        }) || this;
        _this.game = game;
        return _this;
    }
    ModulesManager.prototype.setupFrontDiv = function (card, div, ignoreTooltip) {
        if (ignoreTooltip === void 0) { ignoreTooltip = false; }
        div.dataset.number = '' + card.number;
        if (card.number && !ignoreTooltip) {
            this.game.setTooltip(div.id, this.getTooltip(card));
        }
    };
    ModulesManager.prototype.getGreenhouseShape = function (shape) {
        switch (shape) {
            case 0: return _("Wild");
            case 1: return _("Round");
            case 2: return _("Rectangular");
            case 3: return _("Octagonal");
        }
    };
    ModulesManager.prototype.getTooltip = function (module) {
        var message = "\n        <strong>".concat(_("Color:"), "</strong> ").concat(this.game.getColor(module.color, true), "\n        <br>\n        <strong>").concat(_("Resources needed:"), "</strong> ").concat(getCostStr(module.cost));
        if (module.workforce) {
            message += "<br>\n            <strong>".concat(_("Work points necessary to activate it:"), "</strong> ").concat(module.workforce);
            if (module.matchType) {
                message += "<br>\n                <strong>".concat(_("Effect:"), "</strong> ").concat(this.game.getPower(module.matchType, 1));
            }
        }
        if (module.production) {
            var icons = module.production.map(function (type) { return "<div class=\"resource-icon\" data-type=\"".concat(type, "\"></div>"); });
            message += "<br>\n                <strong>".concat(_("Resources produced:"), "</strong> ").concat(icons.join(" ".concat(_("or"), " ")));
        }
        if (module.adjacentResearchPoints) {
            message += "<br>\n            <strong>".concat(_("Research point gained for ${color} adjacent Modules:").replace('${color}', this.game.getColor(module.matchType, false)), "</strong> ").concat(module.adjacentResearchPoints);
        }
        if (module.researchPoints) {
            message += "<br>\n            <strong>".concat(_("Immediate research point gain:"), "</strong> ").concat(module.researchPoints);
        }
        if (module.points) {
            message += "<br>\n            <strong>".concat(_("Victory points:"), "</strong> ").concat(module.points);
        }
        if (module.color == GREEN) {
            message += "<br>\n            <strong>".concat(_("Greenhouse shape:"), "</strong> ").concat(this.getGreenhouseShape(module.matchType));
        }
        return message;
    };
    ModulesManager.prototype.setForHelp = function (module, divId) {
        var div = document.getElementById(divId);
        div.classList.add('card', 'module');
        div.dataset.side = 'front';
        div.innerHTML = "\n        <div class=\"card-sides\">\n            <div class=\"card-side front\">\n            </div>\n            <div class=\"card-side back\">\n            </div>\n        </div>";
        this.setupFrontDiv(module, div.querySelector('.front'), true);
    };
    ModulesManager.prototype.getHtml = function (module) {
        var html = "<div class=\"card module\" data-side=\"front\" data-type=\"".concat(module.type, "\" data-r=\"").concat(module.r, "\">\n            <div class=\"card-sides\">\n                <div class=\"card-side front\" data-number=\"").concat(module.number, "\">\n                </div>\n            </div>\n        </div>");
        return html;
    };
    return ModulesManager;
}(CardManager));
var ExperimentsManager = /** @class */ (function (_super) {
    __extends(ExperimentsManager, _super);
    function ExperimentsManager(game) {
        var _this = _super.call(this, game, {
            getId: function (card) { return "experiment-".concat(card.id); },
            setupDiv: function (card, div) {
                div.classList.add('experiment');
                div.dataset.cardId = '' + card.id;
                div.dataset.year = '' + card.year;
            },
            setupFrontDiv: function (card, div) {
                div.dataset.number = '' + card.number;
                if (card.number) {
                    game.setTooltip(div.id, _this.getTooltip(card));
                }
            },
            isCardVisible: function (card) { return Boolean(card.number); },
            cardWidth: 150,
            cardHeight: 100,
        }) || this;
        _this.game = game;
        return _this;
    }
    ExperimentsManager.prototype.getTooltip = function (experiment) {
        var message = "\n        <strong>".concat(_("Side:"), "</strong> ").concat(this.game.getSide(experiment.side), "\n        <br>\n        <strong>").concat(_("Resources needed:"), "</strong> ").concat(getCostStr(experiment.cost), "\n        <br>\n        <strong>").concat(_("Research points:"), "</strong> ").concat(experiment.researchPoints);
        if (experiment.effect) {
            message += "<br>\n            <strong>".concat(_("Effect:"), "</strong> ").concat(this.game.getPower(experiment.effect, 2));
        }
        if (experiment.points) {
            message += "<br>\n            <strong>".concat(_("Victory points:"), "</strong> ").concat(experiment.points);
        }
        return message;
    };
    ExperimentsManager.prototype.getHtml = function (experiment) {
        var html = "<div class=\"card experiment\" data-side=\"front\" data-year=\"".concat(experiment.year, "\">\n            <div class=\"card-sides\">\n                <div class=\"card-side front\" data-number=\"").concat(experiment.number, "\">\n                </div>\n            </div>\n        </div>");
        return html;
    };
    return ExperimentsManager;
}(CardManager));
var MissionsManager = /** @class */ (function (_super) {
    __extends(MissionsManager, _super);
    function MissionsManager(game) {
        var _this = _super.call(this, game, {
            getId: function (card) { return "mission-".concat(card.id); },
            setupDiv: function (card, div) {
                div.classList.add('mission');
                game.setTooltip(div.id, _this.getTooltip(card));
                div.dataset.type = '' + card.type;
            },
            setupFrontDiv: function (card, div) {
                div.dataset.number = '' + card.number;
            },
            cardWidth: 206,
            cardHeight: 110,
        }) || this;
        _this.game = game;
        return _this;
    }
    MissionsManager.prototype.getDirection = function (direction) {
        switch (direction) {
            case 1: return _("vertical");
            case 2: return _("horizontal");
            case 3: return _("diagonal");
        }
    };
    MissionsManager.prototype.getTooltip = function (mission) {
        var message = '';
        if (mission.color) {
            message = mission.adjacent ? _("Have at least ${number} adjacent ${color} Modules.") : _("Have at least ${number} ${color} Modules in their base.");
            message = message.replace('${number}', '' + mission.minimum).replace('${color}', this.game.getColor(mission.color, false));
            if (mission.diagonal) {
                message += "<br><br><span color=\"red\">".concat(_("Important: for this Mission only, diagonally adjacent Modules are also counted."), "</span>");
            }
        }
        else if (mission.direction) {
            message = mission.sameColor ? _("Have a ${direction} line of at least ${number} adjacent Modules of the same color.") : _("Have a ${direction} line of at least ${number} adjacent Modules, whatever their color.");
            message = message.replace('${number}', '' + mission.minimum).replace('${direction}', this.getDirection(mission.direction));
        }
        else if (mission.baseType) {
            message = _("Have at least ${number} ${base_icon} and/or ${advanced_icon} pictograms represented on the Experiments they have carried out.");
            message = message.replace('${number}', '' + mission.minimum).replace('${base_icon}', "<div class=\"resource-icon\" data-type=\"".concat(mission.baseType, "\"></div>")).replace('${advanced_icon}', "<div class=\"resource-icon\" data-type=\"".concat(mission.baseType + 10, "\"></div>"));
        }
        else if (mission.side) {
            message = _("Have carried out at least ${number} Experiments from the ${side}");
            message = message.replace('${number}', '' + mission.minimum).replace('${side}', this.game.getSide(mission.side));
        }
        return message;
    };
    MissionsManager.prototype.getHtml = function (mission) {
        var html = "<div class=\"card mission\" data-side=\"front\" data-type=\"".concat(mission.type, "\">\n            <div class=\"card-sides\">\n                <div class=\"card-side front\" data-number=\"").concat(mission.number, "\">\n                </div>\n            </div>\n        </div>");
        return html;
    };
    return MissionsManager;
}(CardManager));
function sleep(ms) {
    return new Promise(function (r) { return setTimeout(r, ms); });
}
var TableCenter = /** @class */ (function () {
    function TableCenter(game, gamedatas) {
        var _this = this;
        this.game = game;
        this.arm = 0;
        this.experiments = new SlotStock(game.experimentsManager, document.getElementById("table-experiments"), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: function (card) { return card.locationArg; },
        });
        this.experiments.addCards(gamedatas.tableExperiments);
        this.experiments.onCardClick = function (card) { return _this.game.onTableExperimentClick(card); };
        this.modules = new SlotStock(game.modulesManager, document.getElementById("table-modules"), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: function (card) { return card.locationArg; },
            gap: '12px',
        });
        this.modules.onCardClick = function (card) { return _this.game.onTableModuleClick(card); };
        this.modules.addCards(gamedatas.tableModules);
        var tableAstronauts = document.getElementById('table-astronauts');
        tableAstronauts.insertAdjacentHTML('beforeend', [0, 1, 2, 3, 4, 5, 6, 7].map(function (spot) { return "<div></div><div class=\"slot\" data-slot-id=\"".concat(spot, "\"></div>"); }).join(''));
        Object.values(gamedatas.players).forEach(function (player) { return player.astronauts.filter(function (astronaut) { return astronaut.location == 'table'; }).forEach(function (astronaut) {
            return tableAstronauts.querySelector(".slot[data-slot-id=\"".concat(astronaut.spot, "\"]")).appendChild(_this.game.astronautsManager.createAstronaut(astronaut));
        }); });
        this.setArm(gamedatas.arm);
    }
    TableCenter.prototype.moveAstronautTimeUnit = function (astronaut, timeUnits) {
        return __awaiter(this, void 0, void 0, function () {
            var astronautDiv;
            return __generator(this, function (_a) {
                astronautDiv = document.getElementById("astronaut-".concat(astronaut.id));
                astronautDiv.classList.remove('selectable', 'selected');
                this.moveAstronaut(astronaut);
                if (this.game.animationManager.animationsActive()) {
                    astronautDiv.style.setProperty('--time-units', '' + timeUnits);
                    astronautDiv.classList.add('animate');
                    setTimeout(function () { return astronautDiv.classList.remove('animate'); }, 2000);
                }
                return [2 /*return*/];
            });
        });
    };
    TableCenter.prototype.moveAstronaut = function (astronaut) {
        var astronautDiv = document.getElementById("astronaut-".concat(astronaut.id));
        astronautDiv.classList.remove('selectable', 'selected');
        var tableAstronauts = document.getElementById('table-astronauts');
        tableAstronauts.querySelector(".slot[data-slot-id=\"".concat(astronaut.spot, "\"]")).appendChild(astronautDiv);
    };
    TableCenter.prototype.removeModule = function (module) {
        this.modules.removeCard(module);
    };
    TableCenter.prototype.shiftModule = function (module) {
        return this.modules.addCard(module);
    };
    TableCenter.prototype.newModule = function (module) {
        return this.modules.addCard(module);
    };
    TableCenter.prototype.setArm = function (arm) {
        // to make sure arm always turn clockwise even with a %
        while (arm < this.arm) {
            arm += 8;
        }
        this.arm = arm;
        document.getElementById('board-2').style.setProperty('--r', "".concat(this.arm));
    };
    TableCenter.prototype.moveArm = function (diff) {
        this.arm += diff;
        document.getElementById('board-2').style.setProperty('--r', "".concat(this.arm));
    };
    TableCenter.prototype.newExperiments = function (tableExperiments, instant) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.experiments.removeAll();
                        if (!!instant) return [3 /*break*/, 2];
                        return [4 /*yield*/, sleep(500)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this.experiments.addCards(tableExperiments, undefined, undefined, instant ? false : 250)];
                }
            });
        });
    };
    TableCenter.prototype.setSelectableModules = function (selectableModules) {
        this.modules.setSelectionMode(selectableModules ? 'single' : 'none', selectableModules);
    };
    TableCenter.prototype.setSelectableExperiments = function (selectableExperiments) {
        this.experiments.setSelectionMode(selectableExperiments ? 'single' : 'none', selectableExperiments);
    };
    TableCenter.prototype.resetModules = function (modules) {
        this.modules.removeAll();
        this.modules.addCards(modules);
    };
    return TableCenter;
}());
var POINT_CASE_HALF_WIDTH = 20.82;
var POINT_CASE_TWO_THIRD_HEIGHT = 36.25;
var RESEARCH_CASE_WIDTH = 40.71;
var RESEARCH_CASE_HEIGHT = 33.5;
var SCIENCE_BY_EXPERIMENT_SPOT = {
    0: 0,
    1: 8,
    2: 15,
    3: 21,
    4: 26,
    5: 30,
    6: 34,
    7: 38,
    8: 42,
    9: 46,
    10: 50,
};
var ResearchBoard = /** @class */ (function () {
    function ResearchBoard(game, gamedatas) {
        var _this = this;
        this.game = game;
        this.moduleDecks = [];
        this.vp = new Map();
        this.sciencePoints = new Map();
        var players = Object.values(gamedatas.players);
        var html = '';
        // points
        players.forEach(function (player) {
            return html += "\n            <div id=\"player-".concat(player.id, "-vp-marker\" class=\"vp marker ").concat(/*this.game.isColorBlindMode() ? 'color-blind' : */ '', "\" data-player-id=\"").concat(player.id, "\" data-player-no=\"").concat(player.playerNo, "\" style=\"--color: #").concat(player.color, ";\"><div class=\"inner vp\"></div></div>\n            <div id=\"player-").concat(player.id, "-research-marker\" class=\"research marker ").concat(/*this.game.isColorBlindMode() ? 'color-blind' : */ '', "\" data-player-id=\"").concat(player.id, "\" data-player-no=\"").concat(player.playerNo, "\" style=\"--color: #").concat(player.color, ";\"><div class=\"inner research\"></div></div>\n            ");
        });
        dojo.place(html, 'research-board');
        players.forEach(function (player) {
            _this.vp.set(Number(player.id), player.vp);
            _this.sciencePoints.set(Number(player.id), player.researchPoints);
        });
        this.moveVP();
        this.moveResearch();
        this.missions = new SlotStock(this.game.missionsManager, document.getElementById("missions"), {
            slotsIds: [1, 2, 3],
            mapCardToSlot: function (card) { return card.locationArg; },
        });
        this.missions.addCards(gamedatas.tableMissions);
        this.setMissionScienceTokens();
        [1, 2, 3].forEach(function (year) {
            document.getElementById('module-decks').insertAdjacentHTML('beforeend', "<div id=\"module-deck-".concat(year, "\" class=\"module-deck\" data-year=\"").concat(year, "\"></div>"));
            _this.moduleDecks[year] = new Deck(_this.game.modulesManager, document.getElementById("module-deck-".concat(year)), {
                cardNumber: gamedatas.moduleDeckCounts[year],
                topCard: gamedatas.moduleDeckTopCard[year],
                counter: {
                    hideWhenEmpty: true,
                },
            });
        });
    }
    ResearchBoard.prototype.getVPCoordinates = function (points) {
        var cases = points > 40 ? points % 40 : points;
        var top = 0;
        var left = 0;
        if (cases > 0 && cases < 12) {
            left = POINT_CASE_HALF_WIDTH * 2 * cases;
        }
        else if (cases == 12) {
            top = POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 23;
        }
        else if (cases > 12 && cases < 25) {
            top = 2 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 2 * (24 - cases);
        }
        else if (cases == 25) {
            top = 3 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * -1;
        }
        else if (cases > 25 && cases < 39) {
            top = 4 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 2 * (cases - 26);
        }
        else if (cases == 39) {
            top = 3 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 25;
        }
        else if (cases == 40) {
            top = 2 * POINT_CASE_TWO_THIRD_HEIGHT;
            left = POINT_CASE_HALF_WIDTH * 26;
        }
        return [40 + left, 27 + top];
    };
    ResearchBoard.prototype.moveVP = function () {
        var _this = this;
        this.vp.forEach(function (points, playerId) {
            var markerDiv = document.getElementById("player-".concat(playerId, "-vp-marker"));
            var coordinates = _this.getVPCoordinates(points);
            var left = coordinates[0];
            var top = coordinates[1];
            var topShift = 0;
            var leftShift = 0;
            _this.vp.forEach(function (iPoints, iPlayerId) {
                if (iPoints % 40 === points % 40 && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
            markerDiv.style.transform = "translateX(".concat(left + leftShift, "px) translateY(").concat(top + topShift, "px)");
        });
    };
    ResearchBoard.prototype.setVP = function (playerId, points) {
        this.vp.set(playerId, points);
        this.moveVP();
    };
    ResearchBoard.prototype.getResearchCoordinates = function (points) {
        var cases = Math.min(points, 50);
        var top = 0;
        var left = RESEARCH_CASE_WIDTH * 7;
        if (cases > 0 && cases < 8) {
            left = RESEARCH_CASE_WIDTH * (cases + 7);
        }
        else if (cases == 8) {
            top = RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * 14;
        }
        else if (cases > 8 && cases < 23) {
            top = 2 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (23 - cases);
        }
        else if (cases == 23) {
            top = 3 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH;
        }
        else if (cases > 23 && cases < 38) {
            top = 4 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (cases - 23);
        }
        else if (cases == 38) {
            top = 5 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * 14;
        }
        else if (cases > 38) {
            top = 6 * RESEARCH_CASE_HEIGHT;
            left = RESEARCH_CASE_WIDTH * (53 - cases);
        }
        return [-10 + left, 253 + top];
    };
    ResearchBoard.prototype.getScienceByResearchPoints = function (points) {
        var sciencePoints = 0;
        Object.entries(SCIENCE_BY_EXPERIMENT_SPOT).forEach(function (_a) {
            var inc = _a[0], minSpot = _a[1];
            if (points >= minSpot) {
                sciencePoints = Number(inc);
            }
        });
        return sciencePoints;
    };
    ResearchBoard.prototype.moveResearch = function () {
        var _this = this;
        this.sciencePoints.forEach(function (points, playerId) {
            var markerDiv = document.getElementById("player-".concat(playerId, "-research-marker"));
            var coordinates = _this.getResearchCoordinates(points);
            var left = coordinates[0];
            var top = coordinates[1];
            var topShift = 0;
            var leftShift = 0;
            _this.sciencePoints.forEach(function (iPoints, iPlayerId) {
                if (iPoints === points && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
            markerDiv.style.transform = "translateX(".concat(left + leftShift, "px) translateY(").concat(top + topShift, "px)");
        });
        var sortedPoints = Array.from(this.sciencePoints.entries()).sort(function (a, b) { return a[1] - b[1]; });
        var uniquePoints = Array.from(new Set(sortedPoints.map(function (a) { return a[1]; })));
        var number = uniquePoints.length;
        var html = "";
        for (var i = 0; i < number; i++) {
            html += "<div>".concat(this.getScienceByResearchPoints(uniquePoints[i]), "</div>");
        }
        var _loop_3 = function (i) {
            html += "<div>";
            var players = sortedPoints.filter(function (entry) { return entry[1] == uniquePoints[i]; });
            players.forEach(function (_a) {
                var playerId = _a[0], points = _a[1];
                html += "<div class=\"marker\" style=\"--color: #".concat(_this.game.getPlayer(playerId).color, ";\"></div>");
            });
            html += "</div>";
        };
        for (var i = 0; i < number; i++) {
            _loop_3(i);
        }
        var elem = document.getElementById("research-positions");
        elem.style.setProperty('--column-number', "".concat(number));
        elem.innerHTML = html;
    };
    ResearchBoard.prototype.setResearchPoints = function (playerId, researchPoints) {
        this.sciencePoints.set(playerId, researchPoints);
        this.moveResearch();
    };
    ResearchBoard.prototype.getResearchPoints = function (playerId) {
        return this.sciencePoints.get(playerId);
    };
    ResearchBoard.prototype.resetMissions = function (missions) {
        this.missions.removeAll();
        this.missions.addCards(missions);
        this.setMissionScienceTokens();
    };
    ResearchBoard.prototype.setMissionScienceTokens = function () {
        this.missions.getCards().filter(function (mission) { return !document.getElementById("mission-science-token-".concat(mission.id)); }).forEach(function (mission) {
            var token = document.createElement('div');
            token.id = "mission-science-token-".concat(mission.id);
            token.classList.add('science', 'icon', 'mission-science-token');
            token.dataset.slotId = "".concat(mission.locationArg);
            document.getElementById('research-board').appendChild(token);
        });
    };
    return ResearchBoard;
}());
var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
;
var log = isDebug ? console.log.bind(window.console) : function () { };
var ModuleStock = /** @class */ (function (_super) {
    __extends(ModuleStock, _super);
    function ModuleStock(game, element, slotsIds) {
        var _this = _super.call(this, game.modulesManager, element, {
            slotsIds: slotsIds,
            mapCardToSlot: function (module) { return "".concat(module.x, "_").concat(module.y); },
        }) || this;
        _this.game = game;
        _this.element = element;
        return _this;
    }
    ModuleStock.prototype.createSlot = function (slotId) {
        _super.prototype.createSlot.call(this, slotId);
        var coordinates = slotId.split('_').map(function (val) { return Number(val); });
        this.slots[slotId].style.setProperty('--area', "slot".concat(coordinates[0] * 1000 + coordinates[1]));
    };
    return ModuleStock;
}(SlotStock));
var PlayerTable = /** @class */ (function () {
    function PlayerTable(game, player) {
        var _this = this;
        this.game = game;
        this.experimentsLines = [];
        this.playerId = Number(player.id);
        var html = "\n        <div id=\"player-table-".concat(this.playerId, "\" class=\"player-table\" style=\"--player-color: #").concat(player.color, ";\">\n            <div id=\"player-table-").concat(this.playerId, "-name\" class=\"name-wrapper\">").concat(player.name, "</div>\n            <div id=\"player-table-").concat(this.playerId, "-modules\" class=\"modules\"></div>\n            <div id=\"player-table-").concat(this.playerId, "-experiments-lines\" class=\"experiments-lines\"></div>\n            <div id=\"player-table-").concat(this.playerId, "-mission\" class=\"mission\"></div>\n        </div>\n        ");
        dojo.place(html, document.getElementById('tables'));
        var playerAstronauts = player.astronauts.filter(function (astronaut) { return astronaut.location == 'player'; });
        var slotsIds = [];
        var xs = __spreadArray(__spreadArray([], player.modules.map(function (module) { return module.x; }), true), playerAstronauts.map(function (astronaut) { return astronaut.x; }), true);
        var ys = __spreadArray(__spreadArray([], player.modules.map(function (module) { return module.y; }), true), playerAstronauts.map(function (astronaut) { return astronaut.y; }), true);
        this.moduleMinX = Math.min.apply(Math, xs);
        this.moduleMaxX = Math.max.apply(Math, xs);
        this.moduleMinY = Math.min.apply(Math, ys);
        this.moduleMaxY = Math.max.apply(Math, ys);
        for (var y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            for (var x = this.moduleMinX; x <= this.moduleMaxX; x++) {
                slotsIds.push("".concat(x, "_").concat(y));
            }
        }
        var modulesDiv = document.getElementById("player-table-".concat(this.playerId, "-modules"));
        modulesDiv.style.setProperty('--rows', "".concat(this.moduleMaxX - this.moduleMinX + 1));
        modulesDiv.style.setProperty('--columns', "".concat(this.moduleMaxY - this.moduleMinY + 1));
        this.modules = new ModuleStock(this.game, modulesDiv, slotsIds);
        this.updateGridTemplateAreas();
        slotsIds.forEach(function (slotId) {
            var slotDiv = modulesDiv.querySelector("[data-slot-id=\"".concat(slotId, "\"]"));
            slotDiv.addEventListener('click', function () {
                if (slotDiv.classList.contains('selectable')) {
                    var coordinates = slotId.split('_').map(function (val) { return Number(val); });
                    _this.game.onPlayerModuleSpotClick(coordinates[0], coordinates[1]);
                }
            });
        });
        this.modules.onCardClick = function (card) { return _this.game.onPlayerModuleClick(card); };
        player.modules.forEach(function (module) { return _this.addModule(module); });
        player.modules.filter(function (module) { return module.type == 9; }).forEach(function (module) { return _this.game.modulesManager.getCardElement(module).dataset.playerColor = player.color; });
        this.voidStock = new VoidStock(this.game.modulesManager, document.getElementById("player-table-".concat(this.playerId, "-name")));
        player.experiments.forEach(function (experiment) { return _this.addExperiment(experiment); });
        var missionDiv = document.getElementById("player-table-".concat(this.playerId, "-mission"));
        this.missions = new LineStock(this.game.missionsManager, missionDiv);
        this.missions.addCards(player.missions);
        playerAstronauts.forEach(function (astronaut) {
            _this.makeSlotForCoordinates(astronaut.x, astronaut.y);
            modulesDiv.querySelector("[data-slot-id=\"".concat(astronaut.x, "_").concat(astronaut.y, "\"]")).appendChild(_this.game.astronautsManager.createAstronaut(astronaut));
            if (!astronaut.remainingWorkforce) {
                document.getElementById("astronaut-".concat(astronaut.id)).dataset.remainingWorkforce = "".concat(astronaut.remainingWorkforce);
            }
        });
        this.addSquares(player.squares);
    }
    PlayerTable.prototype.setSelectableAstronauts = function (astronauts) {
        document.getElementById("player-table-".concat(this.playerId, "-modules")).querySelectorAll('.astronaut').forEach(function (astronaut) {
            return astronaut.classList.toggle('selectable', astronauts.some(function (w) { return w.id == Number(astronaut.dataset.id); }));
        });
    };
    PlayerTable.prototype.setSelectableModules = function (selectableModules) {
        this.modules.setSelectionMode(selectableModules ? 'single' : 'none', selectableModules);
    };
    PlayerTable.prototype.rotateModule = function (module) {
        var moduleDiv = this.game.modulesManager.getCardElement(module);
        moduleDiv.dataset.r = "".concat(module.r);
    };
    PlayerTable.prototype.addModule = function (module) {
        this.makeSlotForCoordinates(module.x, module.y);
        var promise = this.modules.addCard(module);
        var element = this.game.modulesManager.getCardElement(module);
        element.dataset.r = "".concat(module.r);
        if (module.vp) {
            element.querySelector('.front').insertAdjacentHTML('beforeend', "<div class=\"vp icon\" data-vp=\"".concat(module.vp, "\"></div>"));
        }
        return promise;
    };
    PlayerTable.prototype.removeModule = function (module) {
        this.modules.removeCard(module);
    };
    PlayerTable.prototype.createExperimentsLine = function (line) {
        var lineDiv = document.createElement('div');
        document.getElementById("player-table-".concat(this.playerId, "-experiments-lines")).insertAdjacentElement('beforeend', lineDiv);
        this.experimentsLines[line] = new SlotStock(this.game.experimentsManager, lineDiv, {
            gap: '0',
            slotsIds: [1, 2, 3],
            mapCardToSlot: function (card) { return card.side; },
        });
    };
    PlayerTable.prototype.addExperiment = function (experiment) {
        if (!this.experimentsLines[experiment.line]) {
            this.createExperimentsLine(experiment.line);
        }
        return this.experimentsLines[experiment.line].addCard(experiment);
    };
    PlayerTable.prototype.reactivateAstronauts = function () {
        document.getElementById("player-table-".concat(this.playerId, "-modules")).querySelectorAll('.astronaut').forEach(function (astronaut) {
            return astronaut.dataset.remainingWorkforce = astronaut.dataset.workforce;
        });
    };
    PlayerTable.prototype.updateGridTemplateAreas = function () {
        var modulesDiv = document.getElementById("player-table-".concat(this.playerId, "-modules"));
        var linesAreas = [];
        for (var y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            var lineAreas = [];
            for (var x = this.moduleMinX; x <= this.moduleMaxX; x++) {
                lineAreas.push("slot".concat(x * 1000 + y));
            }
            linesAreas.push(lineAreas.join(' '));
        }
        modulesDiv.style.gridTemplateAreas = linesAreas.map(function (line) { return "\"".concat(line, "\""); }).join(' ');
    };
    PlayerTable.prototype.addLeftCol = function () {
        this.moduleMinX = this.moduleMinX - 1;
        var newSlotsIds = [];
        for (var y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            newSlotsIds.push("".concat(this.moduleMinX, "_").concat(y));
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    };
    PlayerTable.prototype.addRightCol = function () {
        this.moduleMaxX = this.moduleMaxX + 1;
        var newSlotsIds = [];
        for (var y = this.moduleMinY; y <= this.moduleMaxY; y++) {
            newSlotsIds.push("".concat(this.moduleMaxX, "_").concat(y));
        }
        this.addNewSlotsIds(newSlotsIds, 'column');
    };
    PlayerTable.prototype.addTopRow = function () {
        this.moduleMinY = this.moduleMinY - 1;
        var newSlotsIds = [];
        for (var x = this.moduleMinX; x <= this.moduleMaxX; x++) {
            newSlotsIds.push("".concat(x, "_").concat(this.moduleMinY));
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    };
    PlayerTable.prototype.addBottomRow = function () {
        this.moduleMaxY = this.moduleMaxY + 1;
        var newSlotsIds = [];
        for (var x = this.moduleMinX; x <= this.moduleMaxX; x++) {
            newSlotsIds.push("".concat(x, "_").concat(this.moduleMaxY));
        }
        this.addNewSlotsIds(newSlotsIds, 'row');
    };
    PlayerTable.prototype.addNewSlotsIds = function (newSlotsIds, type) {
        var _this = this;
        var modulesDiv = document.getElementById("player-table-".concat(this.playerId, "-modules"));
        if (type == 'row') {
            modulesDiv.style.setProperty('--rows', "".concat(this.moduleMaxX - this.moduleMinX + 1));
        }
        else if (type == 'column') {
            modulesDiv.style.setProperty('--columns', "".concat(this.moduleMaxY - this.moduleMinY + 1));
        }
        this.updateGridTemplateAreas();
        this.modules.addSlotsIds(newSlotsIds);
        newSlotsIds.forEach(function (slotId) {
            var slotDiv = modulesDiv.querySelector("[data-slot-id=\"".concat(slotId, "\"]"));
            slotDiv.addEventListener('click', function () {
                if (slotDiv.classList.contains('selectable')) {
                    var coordinates = slotId.split('_').map(function (val) { return Number(val); });
                    _this.game.onPlayerModuleSpotClick(coordinates[0], coordinates[1]);
                }
            });
        });
    };
    PlayerTable.prototype.makeSlotForCoordinates = function (x, y) {
        while (x < this.moduleMinX) {
            this.addLeftCol();
        }
        while (x > this.moduleMaxX) {
            this.addRightCol();
        }
        while (y < this.moduleMinY) {
            this.addTopRow();
        }
        while (y > this.moduleMaxY) {
            this.addBottomRow();
        }
    };
    PlayerTable.prototype.setSelectableModuleSpots = function (possibleCoordinates) {
        var _this = this;
        var modulesDiv = document.getElementById("player-table-".concat(this.playerId, "-modules"));
        if (possibleCoordinates) {
            possibleCoordinates.forEach(function (coordinate) {
                var _a;
                _this.makeSlotForCoordinates(coordinate[0], coordinate[1]);
                (_a = modulesDiv.querySelector("[data-slot-id=\"".concat(coordinate[0], "_").concat(coordinate[1], "\"]"))) === null || _a === void 0 ? void 0 : _a.classList.add('selectable');
            });
        }
        else {
            modulesDiv.querySelectorAll('.slot.selectable').forEach(function (elem) { return elem.classList.remove('selectable'); });
        }
    };
    PlayerTable.prototype.resetModules = function (modules) {
        this.modules.removeAll(modules);
        this.modules.addCards(modules);
    };
    PlayerTable.prototype.resetExperiments = function (experiments) {
        var _this = this;
        var experimentLinesDiv = document.getElementById("player-table-".concat(this.playerId, "-experiments-lines"));
        Array.from(experimentLinesDiv.children).forEach(function (child) {
            child.id = "deleted-".concat(child.id);
            experimentLinesDiv.removeChild(child);
        });
        this.experimentsLines = [];
        experiments.forEach(function (experiment) { return _this.addExperiment(experiment); });
    };
    PlayerTable.prototype.resetMissions = function (missions) {
        this.missions.removeAll();
        this.missions.addCards(missions);
    };
    PlayerTable.prototype.addMission = function (mission) {
        return this.missions.addCard(mission);
    };
    PlayerTable.prototype.setPayButtons = function (payButtons) {
        var _this = this;
        Object.entries(payButtons).forEach(function (entry) {
            var buttons = document.createElement('div');
            buttons.classList.add('buttons');
            document.getElementById("module-".concat(entry[0])).insertAdjacentElement('beforeend', buttons);
            entry[1].forEach(function (resource) {
                var button = document.createElement('button');
                button.classList.add('bgabutton', 'bgabutton_blue');
                button.innerHTML = "<div class=\"resource-icon\" data-type=\"".concat(resource, "\"></div>");
                button.addEventListener('click', function () { return _this.game.pay(Number(entry[0]), resource); });
                buttons.insertAdjacentElement('beforeend', button);
            });
        });
    };
    PlayerTable.prototype.removePayButtons = function () {
        Array.from(document.getElementById("player-table-".concat(this.playerId, "-modules")).getElementsByClassName('buttons')).forEach(function (elem) { return elem.remove(); });
    };
    PlayerTable.prototype.addSquares = function (squares) {
        var _this = this;
        squares.forEach(function (square) {
            var token = document.createElement('div');
            token.classList.add('vp', 'icon', 'square-vp-token');
            document.getElementById("player-table-".concat(_this.playerId, "-modules")).querySelector("[data-slot-id=\"".concat(square.x, "_").concat(square.y, "\"]")).appendChild(token);
        });
    };
    PlayerTable.prototype.resetSquares = function (squares) {
        Array.from(document.getElementById("player-table-".concat(this.playerId, "-modules")).getElementsByClassName('square-vp-token'))
            .filter(function (elem) { return !squares.find(function (square) { return elem.parentElement.dataset.slotId == "".concat(square.x, "_").concat(square.y); }); })
            .forEach(function (elem) { return elem.remove(); });
    };
    return PlayerTable;
}());
var ANIMATION_MS = 500;
var SCORE_MS = 1500;
var ACTION_TIMER_DURATION = 5;
var LOCAL_STORAGE_ZOOM_KEY = 'Humanity-zoom';
var LOCAL_STORAGE_JUMP_TO_FOLDED_KEY = 'Humanity-jump-to-folded';
var LOCAL_STORAGE_HELP_FOLDED_KEY = 'Humanity-help-folded';
var ICONS_COUNTERS_TYPES = [1, 2, 3, 0];
var ANY_COLOR = 0;
var BLUE_OR_ORANGE = 0;
var ORANGE = 1;
var BLUE = 2;
var PURPLE = 3;
var GREEN = 4;
function getCostStr(cost) {
    return Object.entries(cost).filter(function (entry) { return entry[1] > 0; }).map(function (entry) { return "".concat(entry[1], " <div class=\"resource-icon\" data-type=\"").concat(entry[0], "\"></div>"); }).join(' ');
}
var Humanity = /** @class */ (function () {
    function Humanity() {
        this.playersTables = [];
        this.vpCounters = [];
        this.scienceCounters = [];
        this.iconsCounters = [];
        this.TOOLTIP_DELAY = document.body.classList.contains('touch-device') ? 1500 : undefined;
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
    Humanity.prototype.setup = function (gamedatas) {
        var _this = this;
        var _a, _b;
        log("Starting game setup");
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
        document.getElementById("year").insertAdjacentText('beforebegin', _('Year') + ' ');
        this.yearCounter = new ebg.counter();
        this.yearCounter.create("year");
        this.yearCounter.setValue(gamedatas.year);
        (_a = gamedatas.movedAstronauts) === null || _a === void 0 ? void 0 : _a.forEach(function (astronaut) {
            if (astronaut.location == 'table' && astronaut.x !== null) {
                astronaut.location = 'player';
                _this.astronautsManager.moveAstronautDiv(astronaut);
                _this.astronautsManager.setAstronautToConfirm(astronaut, true);
            }
        });
        this.zoomManager = new ZoomManager({
            element: document.getElementById('table'),
            smooth: false,
            zoomControls: {
                color: 'black',
            },
            localStorageZoomKey: LOCAL_STORAGE_ZOOM_KEY,
            onDimensionsChange: function () {
                var tablesAndCenter = document.getElementById('tables-and-center');
                var clientWidth = tablesAndCenter.clientWidth;
                var tablesWidth = Math.max(640 /*, document.getElementById('tables').clientWidth*/);
                tablesAndCenter.classList.toggle('double-column', clientWidth > 1201 + tablesWidth); // 1181 + 20 + tablesWidth
                /*const centerWrapper = document.getElementById('table-center-wrapper');
                const centerClientWidth = centerWrapper.clientWidth;
                centerWrapper.classList.toggle('double-column', centerClientWidth > 2033); // 1181 + 852      */
            },
        });
        var helpButtons = [
            new BgaHelpPopinButton({
                title: _("Tile details").toUpperCase(),
                html: this.getHelpHtml(),
                buttonBackground: '#ba3c1e',
            }),
        ];
        var currentPlayerColor = (_b = this.getPlayer(this.getPlayerId())) === null || _b === void 0 ? void 0 : _b.color;
        if (currentPlayerColor) {
            helpButtons.push(new BgaHelpExpandableButton({
                expandedWidth: '843px',
                expandedHeight: '370px',
                defaultFolded: true,
                localStorageFoldedKey: LOCAL_STORAGE_HELP_FOLDED_KEY,
                buttonExtraClasses: "player-color-".concat(currentPlayerColor)
            }));
        }
        new HelpManager(this, {
            buttons: helpButtons
        });
        this.setupNotifications();
        this.setupPreferences();
        [1, 2, 3].forEach(function (year) {
            document.getElementById("years-progress").insertAdjacentHTML("beforeend", "\n                <div id=\"year-progress-".concat(year, "\" class=\"year-progress\">\n                    <div id=\"in-year-progress-").concat(year, "\" class=\"in-year-progress\"></div>\n                </div>\n            "));
        });
        this.setProgress(gamedatas.year, gamedatas.isEnd ? 101 : gamedatas.inYearProgress);
        if (gamedatas.isEnd) { // score or end
            this.onEnteringShowScore(true);
        }
        log("Ending game setup");
    };
    Humanity.prototype.setProgress = function (currentYear, inYearProgress) {
        [1, 2, 3].forEach(function (year) {
            document.getElementById("year-progress-".concat(year)).classList.toggle('finished', currentYear > year || (currentYear == 3 && inYearProgress > 100));
        });
        document.getElementById("in-year-progress-".concat(currentYear)).style.width = "".concat(Math.min(100, inYearProgress), "%");
    };
    ///////////////////////////////////////////////////
    //// Game & client states
    // onEnteringState: this method is called each time we are entering into a new game state.
    //                  You can use this method to perform some user interface changes at this moment.
    //
    Humanity.prototype.onEnteringState = function (stateName, args) {
        var _a;
        log('Entering state: ' + stateName, args.args);
        if (((_a = args.args) === null || _a === void 0 ? void 0 : _a.astronaut) && this.isCurrentPlayerActive()) {
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
    };
    Humanity.prototype.onEnteringChooseAction = function (args) {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.setSelectableModules(args.activatableModules);
            this.tableCenter.setSelectableModules(args.selectableModules);
            this.tableCenter.setSelectableExperiments(args.selectableExperiments);
        }
    };
    Humanity.prototype.onEnteringActivateModule = function (args) {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.setSelectableModules(args.activatableModules);
        }
    };
    Humanity.prototype.onEnteringPay = function (args) {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.setPayButtons(args.payButtons);
        }
    };
    Humanity.prototype.onEnteringChooseAstronaut = function (args) {
        var _a;
        if (this.isCurrentPlayerActive()) {
            (_a = this.getCurrentPlayerTable()) === null || _a === void 0 ? void 0 : _a.setSelectableAstronauts(args.astronauts);
        }
    };
    Humanity.prototype.onEnteringUpgradeAstronaut = function (args) {
        if (this.isCurrentPlayerActive()) {
            args.astronauts.forEach(function (astronaut) { return document.getElementById("astronaut-".concat(astronaut.id)).classList.add('selectable'); });
        }
    };
    Humanity.prototype.onEnteringMoveAstronaut = function (args) {
        var _a;
        (_a = this.getCurrentPlayerTable()) === null || _a === void 0 ? void 0 : _a.setSelectableModuleSpots(args.possibleCoordinates);
    };
    Humanity.prototype.onEnteringShowScore = function (fromReload) {
        var _this = this;
        if (fromReload === void 0) { fromReload = false; }
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
        ].map(function (label) { return "<tr><th>".concat(label, "</th></tr>"); }).join('');
        var players = Object.values(this.gamedatas.players);
        players.forEach(function (player) { return _this.addPlayerSummaryColumn(Number(player.id), player.endScoreSummary); });
    };
    Humanity.prototype.addPlayerSummaryColumn = function (playerId, endScoreSummary) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var player = this.getPlayer(playerId);
        document.getElementById('scoretr').insertAdjacentHTML('beforeend', "<th class=\"player_name\" style=\"color: #".concat(player.color, "\">").concat(player.name, "</th>"));
        var lines = Array.from(document.getElementById('score-table-body').getElementsByTagName('tr'));
        lines[0].insertAdjacentHTML("beforeend", "<td id=\"score-remainingResources-".concat(playerId, "\">").concat((_a = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.remainingResources) !== null && _a !== void 0 ? _a : '', "</td>"));
        lines[1].insertAdjacentHTML("beforeend", "<td id=\"score-squares-".concat(playerId, "\">").concat((_b = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.squares) !== null && _b !== void 0 ? _b : '', "</td>"));
        lines[2].insertAdjacentHTML("beforeend", "<td id=\"score-greenhouses-".concat(playerId, "\">").concat((_c = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.greenhouses) !== null && _c !== void 0 ? _c : '', "</td>"));
        lines[3].insertAdjacentHTML("beforeend", "<td id=\"score-experiments-".concat(playerId, "\">").concat((_d = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.experiments) !== null && _d !== void 0 ? _d : '', "</td>"));
        lines[4].insertAdjacentHTML("beforeend", "<td id=\"score-missions-".concat(playerId, "\">").concat((_e = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.missions) !== null && _e !== void 0 ? _e : '', "</td>"));
        lines[5].insertAdjacentHTML("beforeend", "<td id=\"score-modules-".concat(playerId, "\">").concat((_f = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.modules) !== null && _f !== void 0 ? _f : '', "</td>"));
        lines[6].insertAdjacentHTML("beforeend", "<td id=\"score-scienceByYear-".concat(playerId, "\">").concat((_g = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.scienceByYear.map(function (points, index) { return "<div>".concat(points, " <span class=\"score-year\">(").concat(_('Year'), " ").concat(index + 1, ")</span></div>"); }).join('')) !== null && _g !== void 0 ? _g : '', "</td>"));
        lines[7].insertAdjacentHTML("beforeend", "<td id=\"score-total-".concat(playerId, "\">").concat((_h = endScoreSummary === null || endScoreSummary === void 0 ? void 0 : endScoreSummary.total) !== null && _h !== void 0 ? _h : '', "</td>"));
    };
    Humanity.prototype.onLeavingState = function (stateName) {
        log('Leaving state: ' + stateName);
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
    };
    Humanity.prototype.onLeavingChooseAction = function () {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.setSelectableModules(null);
            this.tableCenter.setSelectableModules(null);
            this.tableCenter.setSelectableExperiments(null);
        }
    };
    Humanity.prototype.onLeavingActivateModule = function () {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.setSelectableModules(null);
        }
    };
    Humanity.prototype.onLeavingPay = function () {
        if (this.isCurrentPlayerActive()) {
            var table = this.getCurrentPlayerTable();
            table.removePayButtons();
        }
    };
    Humanity.prototype.onLeavingChooseAstronaut = function () {
        var _a;
        (_a = this.getCurrentPlayerTable()) === null || _a === void 0 ? void 0 : _a.setSelectableAstronauts([]);
    };
    Humanity.prototype.onLeavingMoveAstronaut = function () {
        var _a;
        (_a = this.getCurrentPlayerTable()) === null || _a === void 0 ? void 0 : _a.setSelectableModuleSpots(null);
    };
    Humanity.prototype.onLeavingUpgradeAstronaut = function () {
        document.querySelectorAll('.astronaut.selectable').forEach(function (astronaut) { return astronaut.classList.remove('selectable'); });
    };
    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    Humanity.prototype.onUpdateActionButtons = function (stateName, args) {
        var _this = this;
        var _a;
        if (this.isCurrentPlayerActive()) {
            switch (stateName) {
                case 'activateModule':
                    this.addActionButton("endTurn_button", _("End turn"), function () { return _this.endTurn(); });
                    break;
                case 'chooseCommunicationColor':
                    this.addActionButton("blue_button", _("Blue"), function () { return _this.chooseCommunicationColor(2); });
                    this.addActionButton("orange_button", _("Orange"), function () { return _this.chooseCommunicationColor(1); });
                    break;
                case 'pay':
                    if (args.manualAdvancedResource) {
                        document.getElementById('pagemaintitletext').innerHTML = this.gamedatas.gamestate.descriptionmyturnConvert.replace('${resource}', "<div class=\"resource-icon\" data-type=\"".concat(args.manualAdvancedResource, "\"></div>")) + " (".concat(args.usedForManualAdvancedResource.length + 1, "/3)");
                        this.addActionButton("cancelConvertBasicResources-button", _("Cancel manual conversion"), function () { return _this.cancelConvertBasicResources(); }, null, null, 'gray');
                    }
                    else {
                        if (args.autoPay) {
                            this.addActionButton("autoPay_button", _("Automatically spend ${cost}").replace('${cost}', getCostStr(args.autoPay)), function () { return _this.autoPay(); });
                        }
                        var advancedResourcesToPay = Object.keys(args.cost).map(Number).filter(function (resource) { return [11, 12, 13].includes(resource); });
                        advancedResourcesToPay.forEach(function (resource) { return _this.addActionButton("convertBasicResources".concat(resource, "_button"), _("Manually spend basic resources for ${resource}").replace('${resource}', "<div class=\"resource-icon\" data-type=\"".concat(resource, "\"></div>")), function () { return _this.convertBasicResources(resource); }, null, null, 'gray'); });
                    }
                    break;
                case 'confirmTurn':
                    this.addActionButton("confirmTurn_button", _("Confirm turn"), function () { return _this.confirmTurn(); });
                    break;
                case 'moveAstronaut':
                    if (args.canUndo) {
                        this.addActionButton("undoMoveAstronaut_button", _("Undo last move"), function () { return _this.undoMoveAstronaut(); }, null, null, 'red');
                    }
                    break;
                case 'confirmMoveAstronauts':
                    this.addActionButton("confirmMoveAstronauts_button", _("Confirm"), function () { return _this.confirmMoveAstronauts(); });
                    this.addActionButton("undoMoveAstronaut_button", _("Undo last move"), function () { return _this.undoMoveAstronaut(); }, null, null, 'red');
                    break;
            }
            if (['chooseCommunicationColor', 'pay', 'chooseAction', 'upgradeAstronaut', 'activateModule', 'confirmTurn'].includes(stateName)) {
                this.addActionButton("restartTurn_button", _("Restart turn"), function () { return _this.restartTurn(); }, null, null, 'red');
            }
        }
        else {
            if (stateName == 'moveAstronauts' && ((_a = args.activePlayersIds) === null || _a === void 0 ? void 0 : _a.includes(this.getPlayerId()))) { // only players that were active
                this.addActionButton("cancelConfirmAstronaut-button", _("Undo last move"), function () { return _this.cancelConfirmAstronaut(); }, null, null, 'gray');
            }
        }
    };
    ///////////////////////////////////////////////////
    //// Utility methods
    ///////////////////////////////////////////////////
    Humanity.prototype.setTooltip = function (id, html) {
        this.addTooltipHtml(id, html, this.TOOLTIP_DELAY);
    };
    Humanity.prototype.setTooltipToClass = function (className, html) {
        this.addTooltipHtmlToClass(className, html, this.TOOLTIP_DELAY);
    };
    Humanity.prototype.getPlayerId = function () {
        return Number(this.player_id);
    };
    Humanity.prototype.getPlayer = function (playerId) {
        return Object.values(this.gamedatas.players).find(function (player) { return Number(player.id) == playerId; });
    };
    Humanity.prototype.getPlayerTable = function (playerId) {
        return this.playersTables.find(function (playerTable) { return playerTable.playerId === playerId; });
    };
    Humanity.prototype.getCurrentPlayerTable = function () {
        var _this = this;
        return this.playersTables.find(function (playerTable) { return playerTable.playerId === _this.getPlayerId(); });
    };
    Humanity.prototype.getGameStateName = function () {
        return this.gamedatas.gamestate.name;
    };
    Humanity.prototype.setupPreferences = function () {
        var _this = this;
        // Extract the ID and value from the UI control
        var onchange = function (e) {
            var match = e.target.id.match(/^preference_[cf]ontrol_(\d+)$/);
            if (!match) {
                return;
            }
            var prefId = +match[1];
            var prefValue = +e.target.value;
            _this.prefs[prefId].value = prefValue;
        };
        // Call onPreferenceChange() when any value changes
        dojo.query(".preference_control").connect("onchange", onchange);
        // Call onPreferenceChange() now
        dojo.forEach(dojo.query("#ingame_menu_content .preference_control"), function (el) { return onchange({ target: el }); });
    };
    Humanity.prototype.getOrderedPlayers = function (gamedatas) {
        var _this = this;
        var players = Object.values(gamedatas.players).sort(function (a, b) { return a.playerNo - b.playerNo; });
        var playerIndex = players.findIndex(function (player) { return Number(player.id) === Number(_this.player_id); });
        var orderedPlayers = playerIndex > 0 ? __spreadArray(__spreadArray([], players.slice(playerIndex), true), players.slice(0, playerIndex), true) : players;
        return orderedPlayers;
    };
    Humanity.prototype.createPlayerPanels = function (gamedatas) {
        var _this = this;
        Object.values(gamedatas.players).forEach(function (player) {
            var playerId = Number(player.id);
            var html = "<div class=\"counters with-tokens\">            \n                <div id=\"vp-counter-wrapper-".concat(player.id, "\" class=\"vp-counter\">\n                    <div class=\"vp icon\"></div>\n                    <span id=\"vp-counter-").concat(player.id, "\"></span>\n                </div>\n                <div id=\"science-counter-wrapper-").concat(player.id, "\" class=\"science-counter\">\n                    <div class=\"science icon\"></div>\n                    <span id=\"science-counter-").concat(player.id, "\">?</span>\n                </div>\n            </div>\n\n            <div id=\"player-").concat(player.id, "-icons\" class=\"icons counters\"></div>");
            dojo.place(html, "player_board_".concat(player.id));
            _this.vpCounters[playerId] = new ebg.counter();
            _this.vpCounters[playerId].create("vp-counter-".concat(playerId));
            _this.vpCounters[playerId].setValue(player.vp);
            if (gamedatas.isEnd || playerId == _this.getPlayerId()) {
                _this.scienceCounters[playerId] = new ebg.counter();
                _this.scienceCounters[playerId].create("science-counter-".concat(playerId));
                _this.scienceCounters[playerId].setValue(player.science);
            }
            _this.iconsCounters[playerId] = [];
            _this.updateIcons(playerId, player.icons);
            // first player token
            dojo.place("<div id=\"player_board_".concat(player.id, "_firstPlayerWrapper\" class=\"firstPlayerWrapper\"></div>"), "player_board_".concat(player.id));
            if (gamedatas.firstPlayerId === playerId) {
                _this.placeFirstPlayerToken(gamedatas.firstPlayerId);
            }
        });
        this.setTooltipToClass('vp-counter', _('Victory points'));
        this.setTooltipToClass('science-counter', _('Science points'));
        document.getElementById("player_boards").insertAdjacentHTML('beforeend', "\n        <div id=\"overall_player_board_0\" class=\"player-board current-player-board\">\t\t\t\t\t\n            <div class=\"player_board_inner\" id=\"player_board_inner_research-positions\">\n                <div id=\"research-positions\"></div>\n            </div>\n        </div>");
        this.setTooltip('player_board_inner_research-positions', _('Player order in research track, and associated Science points'));
    };
    Humanity.prototype.updateIcons = function (playerId, icons) {
        var _this = this;
        var keys = Object.keys(icons);
        keys.forEach(function (key) {
            var quantity = icons[key];
            if (!_this.iconsCounters[playerId][key]) {
                var icons_1 = JSON.parse(key);
                var iconsHtml = icons_1.map(function (type) { return "<div class=\"resource-icon\" data-type=\"".concat(type, "\"></div>"); }).join('');
                var order = icons_1.length > 1 ? 100 * icons_1[0] + icons_1[1] : icons_1[0];
                var tooltip = icons_1.length > 1 ? _('${a} or ${b}').replace('${a}', _this.getResourceTooltip(icons_1[0])).replace('${b}', _this.getResourceTooltip(icons_1[1])) : _this.getResourceTooltip(icons_1[0]);
                document.getElementById("player-".concat(playerId, "-icons")).insertAdjacentHTML('beforeend', "<div id=\"type-".concat(key, "-counter-wrapper-").concat(playerId, "\" style=\"order: ").concat(order, ";\">\n                    <span class=\"").concat(icons_1.length > 1 ? 'double-icons' : '', "\">").concat(iconsHtml, "</span> <span id=\"type-").concat(key, "-counter-").concat(playerId, "\"></span>\n                </div>"));
                _this.iconsCounters[playerId][key] = new ebg.counter();
                _this.iconsCounters[playerId][key].create("type-".concat(key, "-counter-").concat(playerId));
                _this.iconsCounters[playerId][key].setValue(quantity);
                _this.setTooltip("type-".concat(key, "-counter-wrapper-").concat(playerId), tooltip);
            }
            else {
                _this.iconsCounters[playerId][key].toValue(quantity);
            }
        });
        Object.keys(this.iconsCounters[playerId]).filter(function (key) { return !keys.includes(key); }).forEach(function (key) {
            var _a;
            (_a = document.getElementById("type-".concat(key, "-counter-wrapper-").concat(playerId))) === null || _a === void 0 ? void 0 : _a.remove();
            _this.iconsCounters[playerId][key] = null;
        });
    };
    Humanity.prototype.createPlayerTables = function (gamedatas) {
        var _this = this;
        var orderedPlayers = this.getOrderedPlayers(gamedatas);
        orderedPlayers.forEach(function (player) {
            return _this.createPlayerTable(gamedatas, Number(player.id));
        });
    };
    Humanity.prototype.createPlayerTable = function (gamedatas, playerId) {
        var table = new PlayerTable(this, gamedatas.players[playerId]);
        this.playersTables.push(table);
    };
    Humanity.prototype.placeFirstPlayerToken = function (playerId) {
        var firstPlayerToken = document.getElementById('firstPlayerToken');
        if (firstPlayerToken) {
            this.animationManager.attachWithAnimation(new BgaSlideAnimation({
                element: firstPlayerToken,
            }), document.getElementById("player_board_".concat(playerId, "_firstPlayerWrapper")));
        }
        else {
            dojo.place('<div id="firstPlayerToken"></div>', "player_board_".concat(playerId, "_firstPlayerWrapper"));
            this.addTooltipHtml('firstPlayerToken', _("First Player token"));
            return Promise.resolve(true);
        }
    };
    Humanity.prototype.setScore = function (playerId, score) {
        var _a;
        (_a = this.scoreCtrl[playerId]) === null || _a === void 0 ? void 0 : _a.toValue(score);
    };
    Humanity.prototype.setVP = function (playerId, count) {
        this.researchBoard.setVP(playerId, count);
        this.vpCounters[playerId].toValue(count);
    };
    Humanity.prototype.setScience = function (playerId, count) {
        if (this.scienceCounters[playerId]) {
            this.scienceCounters[playerId].toValue(count);
        }
        else {
            this.scienceCounters[playerId] = new ebg.counter();
            this.scienceCounters[playerId].create("science-counter-".concat(playerId));
            this.scienceCounters[playerId].setValue(count);
        }
    };
    Humanity.prototype.setResearchPoints = function (playerId, count) {
        this.researchBoard.setResearchPoints(playerId, count);
    };
    Humanity.prototype.getHelpHtml = function () {
        var html = "\n        <div id=\"help-popin\">\n            <h1>".concat(_("Experiment Tiles"), "</h1>\n\n            <div class=\"help-section\">\n                <div><span class=\"legend-number\">1</span> ").concat(_("Resources needed to carry it out"), "</div>\n                <div><span class=\"legend-number\">2</span> ").concat(_("Research points"), "</div>\n                <div><span class=\"legend-number\">3</span> ").concat(_("Effect"), "</div>\n                <div><span class=\"legend-number\">4</span> ").concat(_("Victory point (only for Year 3)"), "</div>\n                <div class=\"tiles\">\n                    <div class=\"legend-tile-wrapper\">\n                        ").concat(this.experimentsManager.getHtml({ year: 3, number: 2 }), "\n                        <div class=\"legend-number\" style=\"left: 10px; bottom: 0px;\">1</div>\n                        <div class=\"legend-number\" style=\"left: 49px; top: 2px;\">2</div>\n                        <div class=\"legend-number\" style=\"left: 81px; top: 2px;\">3</div>\n                        <div class=\"legend-number\" style=\"right: -26px; top: -8px;\">4</div>\n                    </div>\n                </div>\n\n                <h2><div class=\"reactivate icon\"></div></h2>\n                <div>").concat(this.getPower(1, 2), "</div>\n                <h2><div class=\"time-unit icon\"></div></h2>\n                <div>").concat(this.getPower(2, 2), "</div>\n            </div>\n\n            <h1>").concat(_("Module Tiles"), "</h1>\n\n            <div class=\"help-section\">\n                <div><span class=\"legend-number\">1</span> ").concat(_("Resources necessary for deployment"), "</div>\n                <div><span class=\"legend-number\">2</span> ").concat(_("Number of Work points necessary to activate it"), "</div>\n                <div><span class=\"legend-number\">3</span> ").concat(_("Quantity and type of resources produced"), "</div>\n                <div><span class=\"legend-number\">4</span> ").concat(_("Research point gained for adjacent Modules"), "</div>\n                <div><span class=\"legend-number\">5</span> ").concat(_("Immediate research point gain"), "</div>\n                <div class=\"tiles\">\n                    <div class=\"legend-tile-wrapper\">\n                        ").concat(this.modulesManager.getHtml({ type: 1, number: 8, r: 1 }), "\n                        <div class=\"legend-number\" style=\"left: 0; bottom: 0;\">1</div>\n                        <div class=\"legend-number\" style=\"left: 49px; bottom: -22px;\">2</div>\n                        <div class=\"legend-number\" style=\"left: 101px; bottom: 3px;\">3</div>\n                    </div>\n                    <div class=\"legend-tile-wrapper\">\n                        ").concat(this.modulesManager.getHtml({ type: 1, number: 11 }), "\n                        <div class=\"legend-number\" style=\"left: 0; bottom: 0;\">1</div>\n                        <div class=\"legend-number\" style=\"left: -14px; top: 64px;\">4</div>\n                        <div class=\"legend-number\" style=\"right: -14px; top: 64px;\">4</div>\n                        <div class=\"legend-number\" style=\"left: 64px; bottom: -14px;\">4</div>\n                        <div class=\"legend-number\" style=\"right: 2px; bottom: 2px;\">5</div>\n                    </div>\n                </div>\n            </div>\n\n            <h2>").concat(_("Production modules"), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 1 Work point to activate and produces 1 basic resource that can be spent later."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 0, number: 2, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 0, number: 1, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 0, number: 3, r: 1 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 1 Work point to activate and produces 1 variable basic resource. But, the player does not have to choose which resource type it is until they spend it later on. If they decide to spend several resources from this Module at once, they can choose different resources for each."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 4, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 5, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 6, r: 1 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 2 Work points to activate and produces 1 advanced resource, that can be spent later."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 0, number: 4, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 7, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 8, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 9, r: 1 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 2 Work point to activate and produces 1 variable advanced resource. But, the player does not have to choose which resource type it is until they spend it later on. If they decide to spend several resources from this Module at once, they can choose different resources for each."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 6, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 7, r: 1 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 8, r: 1 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 1 Work point to activate and produces 1 electricity that can be spent later. Players can spend 1 electricity to replace 1 basic resource (methane, ice, or insect)."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 4, r: 1 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(_("This type of Module requires 1 Work point to activate and produces 1 Time unit <strong>that must be spent immediately</strong>: <strong>All</strong> of that player’s Astronauts around the main board are moved 1 hangar counterclockwise. Astronauts cannot be moved beyond the articulated arm."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 3, r: 0 }), "\n                </div>\n            </div>\n\n            <h2>").concat(_("Modules that Earn Research Points"), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(_("When a Communications Module is deployed, the player chooses whether it is blue or orange. This tile is then discarded and either a blue tile or an orange tile is taken from the additional Communications Modules for the current year, matching the player’s choice. It is placed in their Base following the usual rules."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 1, number: 1 }), "\n                    =&gt;\n                    ").concat(this.modulesManager.getHtml({ type: 8, number: 1 }), "\n                    /\n                    ").concat(this.modulesManager.getHtml({ type: 8, number: 4 }), "\n                </div>\n            </div>  \n\n            <div class=\"help-section\">\n                <div>").concat(_("When a player deploys this type of Module, they immediately earn the number of research points indicated at the bottom right. In addition, for each adjacent module of the indicated color (green, orange, purple, and/or blue), they immediately earn the number of research points shown. If the player <strong>later</strong> deploys a Module of the indicated color adjacent to this one, they earn the number of research points shown."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 9 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 12 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 11 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 2, number: 10 }), "\n                </div>\n            </div>\n\n            <h2>").concat(_("Greenhouse Modules"), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(_("Greenhouses have special placement rules and allow the player to score points during the game (the size of the Greenhouse group after deploying the tile). There are 3 different types: round, rectangular, and octagonal."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 12 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 13 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 14 }), "\n                </div>\n            </div>  \n\n            <div class=\"help-section\">\n                <div>").concat(_("This special Greenhouse Module is a “wild” whose type is chosen by the player (round, rectangular, or octagonal). This choice may change depending on the Greenhouses that are placed around it. It also earns the player 1 victory point when it is deployed."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 15 }), "\n                </div>\n            </div>  \n\n            <h2>").concat(_("Drone Landing Strips"), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(_("These Modules earn the player 1 victory point when deployed. They count as a blue or orange Module, depending on their color, but cannot be activated."), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 5 }), "\n                    ").concat(this.modulesManager.getHtml({ type: 3, number: 2 }), "\n                </div>\n            </div>            \n\n            <h1>").concat(_("Mission Tiles"), "</h1>\n\n            <h2>").concat(_("Missions ${letter}").replace('${letter}', 'A'), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, adjacent: true, color: ORANGE }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, adjacent: true, color: BLUE }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, adjacent: true, color: PURPLE, diagonal: true }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 1 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 2 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 3 }), "\n                </div>\n\n                <div>\n                    ").concat(_("Note: For these Missions, the layout of the Modules presented on the tiles is for information only — the player does not have to reproduce it exactly to complete the Mission."), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 6, adjacent: false, color: ORANGE }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, adjacent: false, color: BLUE }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, adjacent: false, color: PURPLE }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 4 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 5 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 1, number: 6 }), "\n                </div>\n            </div>\n\n            <h2>").concat(_("Missions ${letter}").replace('${letter}', 'B'), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, direction: 1, sameColor: false }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 5, direction: 2, sameColor: false }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, direction: 3, sameColor: false }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 1 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 2 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 3 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, direction: 1, sameColor: true }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, direction: 2, sameColor: true }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, direction: 3, sameColor: true }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 4 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 5 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 2, number: 6 }), "\n                </div>\n            </div>\n\n            <h2>").concat(_("Missions ${letter}").replace('${letter}', 'C'), "</h2>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, baseType: 1 }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, baseType: 2 }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 4, baseType: 3 }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 1 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 2 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 3 }), "\n                </div>\n            </div>\n\n            <div class=\"help-section\">\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, side: 1 }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, side: 2 }), "</div>\n                <div>").concat(this.missionsManager.getTooltip({ minimum: 3, side: 3 }), "</div>\n                <div class=\"tiles\">\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 4 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 5 }), "\n                    ").concat(this.missionsManager.getHtml({ type: 3, number: 6 }), "\n                </div>\n            </div>\n        ");
        return html;
    };
    Humanity.prototype.onTableExperimentClick = function (experiment) {
        var _this = this;
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            var args = this.gamedatas.gamestate.args;
            if (experiment.effect == 1 && !args.reactivatableAstronauts) {
                this.confirmationDialog(_("There are no astronaut to reactivate."), function () { return _this.chooseNewExperiment(experiment.id); });
            }
            else {
                this.chooseNewExperiment(experiment.id);
            }
        }
    };
    Humanity.prototype.onPlayerModuleClick = function (module) {
        var _this = this;
        if (['activateModule', 'chooseAction'].includes(this.gamedatas.gamestate.name)) {
            var args = this.gamedatas.gamestate.args;
            if (module.matchType == 2 && !args.timeUnitUseful) {
                this.confirmationDialog(_("There are no astronaut to move."), function () { return _this.activateModule(module.id); });
            }
            else {
                this.activateModule(module.id);
            }
        }
    };
    Humanity.prototype.onPlayerModuleSpotClick = function (x, y) {
        var _a;
        if (((_a = this.gamedatas.gamestate.private_state) === null || _a === void 0 ? void 0 : _a.name) == 'moveAstronaut') {
            this.moveAstronaut(x, y);
        }
    };
    Humanity.prototype.onTableModuleClick = function (module) {
        if (this.gamedatas.gamestate.name == 'chooseAction') {
            this.chooseNewModule(module.id);
        }
    };
    Humanity.prototype.onAstronautClick = function (astronaut) {
        if (['chooseAction', 'chooseAstronaut'].includes(this.gamedatas.gamestate.name)) {
            this.chooseAstronaut(astronaut.id);
        }
        else if (this.gamedatas.gamestate.name == 'upgradeAstronaut') {
            this.upgradeAstronaut(astronaut.id);
        }
    };
    Humanity.prototype.chooseAstronaut = function (id) {
        if (!this.checkAction('chooseAstronaut')) {
            return;
        }
        this.takeAction('chooseAstronaut', {
            id: id
        });
    };
    Humanity.prototype.upgradeAstronaut = function (id) {
        if (!this.checkAction('upgradeAstronaut')) {
            return;
        }
        this.takeAction('upgradeAstronaut', {
            id: id
        });
    };
    Humanity.prototype.activateModule = function (id) {
        if (!this.checkAction('activateModule')) {
            return;
        }
        this.takeAction('activateModule', {
            id: id
        });
    };
    Humanity.prototype.chooseNewModule = function (id) {
        if (!this.checkAction('chooseNewModule')) {
            return;
        }
        this.takeAction('chooseNewModule', {
            id: id
        });
    };
    Humanity.prototype.chooseCommunicationColor = function (color) {
        if (!this.checkAction('chooseCommunicationColor')) {
            return;
        }
        this.takeAction('chooseCommunicationColor', {
            color: color
        });
    };
    Humanity.prototype.chooseNewExperiment = function (id) {
        if (!this.checkAction('chooseNewExperiment')) {
            return;
        }
        this.takeAction('chooseNewExperiment', {
            id: id
        });
    };
    Humanity.prototype.pay = function (id, resource) {
        if (!this.checkAction('pay')) {
            return;
        }
        this.takeAction('pay', {
            id: id,
            resource: resource
        });
    };
    Humanity.prototype.autoPay = function () {
        if (!this.checkAction('autoPay')) {
            return;
        }
        this.takeAction('autoPay');
    };
    Humanity.prototype.convertBasicResources = function (resource) {
        if (!this.checkAction('convertBasicResources')) {
            return;
        }
        this.takeAction('convertBasicResources', {
            resource: resource
        });
    };
    Humanity.prototype.cancelConvertBasicResources = function () {
        if (!this.checkAction('cancelConvertBasicResources')) {
            return;
        }
        this.takeAction('cancelConvertBasicResources');
    };
    Humanity.prototype.endTurn = function () {
        if (!this.checkAction('endTurn')) {
            return;
        }
        this.takeAction('endTurn');
    };
    Humanity.prototype.confirmTurn = function () {
        if (!this.checkAction('confirmTurn')) {
            return;
        }
        this.takeAction('confirmTurn');
    };
    Humanity.prototype.restartTurn = function () {
        this.takeAction('restartTurn');
    };
    Humanity.prototype.moveAstronaut = function (x, y) {
        if (!this.checkAction('moveAstronaut')) {
            return;
        }
        this.takeAction('moveAstronaut', {
            x: x + 1000,
            y: y + 1000,
        });
    };
    Humanity.prototype.confirmMoveAstronauts = function () {
        if (!this.checkAction('confirmMoveAstronauts')) {
            return;
        }
        this.takeAction('confirmMoveAstronauts');
    };
    Humanity.prototype.cancelConfirmAstronaut = function () {
        this.takeAction('cancelConfirmAstronaut');
    };
    Humanity.prototype.undoMoveAstronaut = function () {
        if (!this.checkAction('undoMoveAstronaut')) {
            return;
        }
        this.takeAction('undoMoveAstronaut');
    };
    Humanity.prototype.takeAction = function (action, data) {
        data = data || {};
        data.lock = true;
        this.ajaxcall("/humanity/humanity/".concat(action, ".html"), data, this, function () { });
    };
    ///////////////////////////////////////////////////
    //// Reaction to cometD notifications
    /*
        setupNotifications:

        In this method, you associate each of your game notifications with your local method to handle it.

        Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                your pylos.game.php file.

    */
    Humanity.prototype.setupNotifications = function () {
        //log( 'notifications subscriptions setup' );
        var _this = this;
        var notifs = [
            ['firstPlayerToken', undefined],
            ['activateModule', ANIMATION_MS],
            ['pay', 50],
            ['removeModule', ANIMATION_MS],
            ['disableAstronaut', ANIMATION_MS],
            ['gainTimeUnit', ANIMATION_MS * 3],
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
        notifs.forEach(function (notif) {
            dojo.subscribe(notif[0], _this, function (notifDetails) {
                log("notif_".concat(notif[0]), notifDetails.args);
                var promise = _this["notif_".concat(notif[0])](notifDetails.args);
                if (notifDetails.args.playerId && notifDetails.args.icons) {
                    _this.updateIcons(notifDetails.args.playerId, notifDetails.args.icons);
                }
                // tell the UI notification ends, if the function returned a promise
                promise === null || promise === void 0 ? void 0 : promise.then(function () { return _this.notifqueue.onSynchronousNotificationEnd(); });
            });
            _this.notifqueue.setSynchronous(notif[0], notif[1]);
        });
        if (isDebug) {
            notifs.forEach(function (notif) {
                if (!_this["notif_".concat(notif[0])]) {
                    console.warn("notif_".concat(notif[0], " function is not declared, but listed in setupNotifications"));
                }
            });
            Object.getOwnPropertyNames(Humanity.prototype).filter(function (item) { return item.startsWith('notif_'); }).map(function (item) { return item.slice(6); }).forEach(function (item) {
                if (!notifs.some(function (notif) { return notif[0] == item; })) {
                    console.warn("notif_".concat(item, " function is declared, but not listed in setupNotifications"));
                }
            });
        }
    };
    Humanity.prototype.notif_firstPlayerToken = function (notif) {
        return this.placeFirstPlayerToken(notif.args.playerId);
    };
    Humanity.prototype.notif_activateModule = function (args) {
        var playerId = args.playerId;
        var playerTable = this.getPlayerTable(playerId);
        playerTable.rotateModule(args.module);
    };
    Humanity.prototype.notif_pay = function (args) {
        var playerId = args.playerId;
        var playerTable = this.getPlayerTable(playerId);
        playerTable.rotateModule(args.module);
    };
    Humanity.prototype.notif_removeModule = function (args) {
        var playerId = args.playerId;
        var playerTable = this.getPlayerTable(playerId);
        playerTable.removeModule(args.module);
    };
    Humanity.prototype.notif_disableAstronaut = function (args) {
        this.astronautsManager.updateAstronaut(args.astronaut);
    };
    Humanity.prototype.notif_gainTimeUnit = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var astronauts, timeUnits;
            var _this = this;
            return __generator(this, function (_a) {
                astronauts = args.astronauts, timeUnits = args.timeUnits;
                return [2 /*return*/, Promise.all(astronauts.map(function (astronaut) { return _this.tableCenter.moveAstronautTimeUnit(astronaut, timeUnits); }))];
            });
        });
    };
    Humanity.prototype.notif_moveAstronautToTable = function (args) {
        var astronaut = args.astronaut;
        this.astronautsManager.updateAstronaut(astronaut);
        this.tableCenter.moveAstronaut(astronaut);
    };
    Humanity.prototype.notif_deployModule = function (args) {
        var playerId = args.playerId, module = args.module;
        return this.getPlayerTable(playerId).addModule(module);
    };
    Humanity.prototype.notif_addSquares = function (args) {
        var playerId = args.playerId, squares = args.squares;
        return this.getPlayerTable(playerId).addSquares(squares);
    };
    Humanity.prototype.notif_deployExperiment = function (args) {
        var playerId = args.playerId, experiment = args.experiment;
        return this.getPlayerTable(playerId).addExperiment(experiment);
    };
    Humanity.prototype.notif_endScore = function (args) {
        var _a;
        var field = args.field, playerId = args.playerId, endScoreSummary = args.endScoreSummary;
        document.getElementById("score-".concat(field, "-").concat(playerId)).innerHTML = field == 'scienceByYear' ?
            "".concat((_a = endScoreSummary.scienceByYear.map(function (points, index) { return "<div>".concat(points, " <span class=\"score-year\">(").concat(_('Year'), " ").concat(index + 1, ")</span></div>"); }).join('')) !== null && _a !== void 0 ? _a : '', "</td>") :
            "".concat(endScoreSummary[field]);
    };
    Humanity.prototype.notif_score = function (args) {
        this.setScore(args.playerId, args.new);
        this.setScience(args.playerId, Number(args.inc));
    };
    Humanity.prototype.notif_researchPoints = function (args) {
        this.setResearchPoints(args.playerId, args.new);
    };
    Humanity.prototype.notif_vp = function (args) {
        this.setVP(args.playerId, args.new);
    };
    Humanity.prototype.notif_science = function (args) {
        if (!args.private || args.playerId == this.getPlayerId()) {
            this.setScience(args.playerId, args.new);
        }
    };
    Humanity.prototype.notif_newFirstPlayer = function (args) {
        this.placeFirstPlayerToken(args.playerId);
    };
    Humanity.prototype.notif_removeTableModule = function (args) {
        this.tableCenter.removeModule(args.module);
    };
    Humanity.prototype.notif_shiftTableModule = function (args) {
        this.tableCenter.shiftModule(args.module);
    };
    Humanity.prototype.notif_newTableModule = function (args) {
        var module = args.module, year = args.year, moduleDeckCount = args.moduleDeckCount, moduleDeckTopCard = args.moduleDeckTopCard;
        this.tableCenter.newModule(module);
        this.researchBoard.moduleDecks[year].setCardNumber(moduleDeckCount, moduleDeckTopCard);
        this.setProgress(args.year, args.inYearProgress);
    };
    Humanity.prototype.notif_moveArm = function (args) {
        this.tableCenter.moveArm(Number(args.diff));
    };
    Humanity.prototype.notif_newTableExperiments = function (args) {
        this.tableCenter.newExperiments(args.tableExperiments, false);
    };
    Humanity.prototype.notif_reactivateAstronauts = function (args) {
        if (args.playerId) {
            this.getPlayerTable(args.playerId).reactivateAstronauts();
        }
        else {
            this.playersTables.forEach(function (playerTable) { return playerTable.reactivateAstronauts(); });
        }
    };
    Humanity.prototype.notif_upgradeAstronaut = function (args) {
        this.astronautsManager.updateAstronaut(args.astronaut);
    };
    Humanity.prototype.notif_year = function (args) {
        var year = +args.year;
        this.setProgress(year, args.inYearProgress);
        if (year != this.yearCounter.getValue()) {
            this.yearCounter.toValue(year);
            var label = document.querySelector('.year-text');
            label.classList.remove('animate');
            label.clientWidth;
            label.classList.add('animate');
        }
    };
    Humanity.prototype.notif_gainMission = function (args) {
        var _a;
        var playerId = args.playerId, mission = args.mission, fromPlayerId = args.fromPlayerId;
        if (fromPlayerId === null) {
            (_a = document.getElementById("mission-science-token-".concat(mission.id))) === null || _a === void 0 ? void 0 : _a.remove();
        }
        return this.getPlayerTable(playerId).addMission(mission);
    };
    Humanity.prototype.notif_restartTurn = function (args) {
        var _this = this;
        var playerId = args.playerId, undo = args.undo;
        var originalInstantaneousMode = this.instantaneousMode;
        this.instantaneousMode = true;
        this.tableCenter.resetModules(undo.tableModules);
        this.tableCenter.newExperiments(undo.tableExperiments, true);
        this.researchBoard.resetMissions(undo.allMissions.filter(function (mission) { return mission.location == 'table'; }));
        this.playersTables.forEach(function (playerTable) { return playerTable.resetMissions(undo.allMissions.filter(function (mission) { return mission.location == 'player' && mission.locationArg == playerTable.playerId; })); });
        var playerTable = this.getPlayerTable(playerId);
        playerTable.resetModules(undo.modules);
        //playerTable.resetExperiments(undo.experiments); // useless as table reset will remove
        playerTable.resetSquares(undo.squares);
        undo.astronauts.forEach(function (astronaut) { return _this.astronautsManager.resetAstronaut(astronaut); });
        this.setResearchPoints(playerId, undo.researchPoints);
        this.setVP(playerId, undo.vp);
        if (args.playerId == this.getPlayerId()) {
            this.setScience(playerId, undo.science);
        }
        this.instantaneousMode = originalInstantaneousMode;
    };
    Humanity.prototype.notif_moveAstronaut = function (args) {
        var astronaut = args.astronaut, toConfirm = args.toConfirm;
        astronaut.location = astronaut.x !== null ? 'player' : 'table';
        this.astronautsManager.moveAstronautDiv(astronaut);
        this.astronautsManager.setAstronautToConfirm(astronaut, toConfirm);
    };
    Humanity.prototype.notif_confirmMoveAstronauts = function (args) {
        var _this = this;
        var astronauts = args.astronauts;
        astronauts.forEach(function (astronaut) {
            _this.astronautsManager.moveAstronautDiv(astronaut);
            _this.astronautsManager.setAstronautToConfirm(astronaut, false);
        });
    };
    Humanity.prototype.getColor = function (color, blueOrOrange) {
        switch (color) {
            case 0: return blueOrOrange ? _("Blue or orange") : _("Any color");
            case ORANGE: return _("Orange");
            case BLUE: return _("Blue");
            case PURPLE: return _("Purple");
            case GREEN: return _("Green");
        }
    };
    Humanity.prototype.getPower = function (power, timeUnits) {
        switch (power) {
            case 1: return _("All Astronauts in the player’s Base are immediately reactivated: They are turned around to face the player and can be used again to perform an action starting <strong>from their next turn</strong>. If the player has no Astronauts to reactivate, the effect is lost.");
            case 2: return _("The player <strong>immediately</strong> gains ${number} Time unit(s): <strong>All their Astronauts</strong> around the main board are moved ${number} hangar(s) counterclockwise (including the one who just carried out this Experiment). Astronauts cannot be moved beyond the articulated arm.").replace(/\$\{number\}/g, timeUnits);
        }
    };
    Humanity.prototype.getSide = function (side) {
        switch (side) {
            case 1: return _("left side");
            case 2: return _("center");
            case 3: return _("right side");
        }
    };
    Humanity.prototype.getResourceTooltip = function (color) {
        switch (color) {
            case 0: return _("Electricity");
            case 1: return _("Ice");
            case 2: return _("Methane");
            case 3: return _("Insect");
            case 11: return _("Oxygen");
            case 12: return _("Aircarbon");
            case 13: return _("Protein");
        }
    };
    /* This enable to inject translatable styled things to logs or action bar */
    /* @Override */
    Humanity.prototype.format_string_recursive = function (log, args) {
        try {
            if (log && args && !args.processed) {
                ['cost', 'types'].forEach(function (argName) {
                    if (args[argName] && (typeof args[argName] !== 'string' || args[argName][0] !== '<')) {
                        args[argName] = getCostStr(args[argName]);
                    }
                });
                if (args.module_image === '' && args.module) {
                    args.module_image = "<div class=\"log-image\">".concat(this.modulesManager.getHtml(args.module), "</div>");
                }
                if (args.experiment_image === '' && args.experiment) {
                    args.experiment_image = "<div class=\"log-image\">".concat(this.experimentsManager.getHtml(args.experiment), "</div>");
                }
                if (args.mission_image === '' && args.mission) {
                    args.mission_image = "<div class=\"log-image\">".concat(this.missionsManager.getHtml(args.mission), "</div>");
                }
                /* TODO DELETE ? for (const property in args) {
                    if (['number', 'color', 'card_color', 'card_type', 'mission_name'].includes(property) && args[property][0] != '<') {
                        args[property] = `<strong>${_(args[property])}</strong>`;
                    }
                }*/
            }
        }
        catch (e) {
            console.error(log, args, "Exception thrown", e.stack);
        }
        return this.inherited(arguments);
    };
    return Humanity;
}());
define([
    "dojo", "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock"
], function (dojo, declare) {
    return declare("bgagame.humanity", ebg.core.gamegui, new Humanity());
});
