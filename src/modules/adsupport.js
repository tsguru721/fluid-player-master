
export default function (playerInstance, options) {
    const VPAID_VERSION = '2.0';

    playerInstance.renderLinearAd = (ad, backupTheVideoTime) => {
        playerInstance.toggleLoader(false);

        //get the proper ad
        playerInstance.vastOptions = ad;

        if (backupTheVideoTime) {
            playerInstance.backupMainVideoContentTime(ad.rollListId);
        }

        const playVideoPlayer = ad => {
            playerInstance.switchPlayerToVpaidMode = ad => {
                playerInstance.debugMessage('starting function switchPlayerToVpaidMode');
                const vpaidIframe = playerInstance.videoPlayerId + "_" + ad.id + "_fluid_vpaid_iframe";
                const creativeData = {};
                creativeData.AdParameters = ad.adParameters;
                const slotElement = document.createElement('div');
                slotElement.id = playerInstance.videoPlayerId + "_fluid_vpaid_slot";
                slotElement.className = 'fluid_vpaid_slot';
                slotElement.setAttribute('adListId', ad.id);

                playerInstance.domRef.player.parentNode.insertBefore(slotElement, vpaidIframe.nextSibling);

                const environmentVars = {
                    slot: slotElement,
                    videoSlot: playerInstance.domRef.player,
                    videoSlotCanAutoPlay: true
                };

                // calls this functions after ad unit is loaded in iframe
                const ver = playerInstance.vpaidAdUnit.handshakeVersion(VPAID_VERSION);
                const compare = playerInstance.compareVersion(VPAID_VERSION, ver);
                if (compare === 1) {
                    //VPAID version of ad is lower than we need
                    ad.error = true;
                    playerInstance.playMainVideoWhenVpaidFails(403);
                    return false;
                }

                if (playerInstance.vastOptions.skipoffset !== false) {
                    playerInstance.addSkipButton();
                }

                playerInstance.domRef.player.loop = false;
                playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

                playerInstance.vpaidCallbackListenersAttach();
                const mode = (playerInstance.fullscreenMode ? 'fullscreen' : 'normal');
                const adWidth = playerInstance.domRef.player.offsetWidth;
                const adHeight = playerInstance.domRef.player.offsetHeight;
                playerInstance.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

                const progressbarContainer = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = playerInstance.displayOptions.layoutControls.adProgressColor;
                }

                playerInstance.toggleLoader(false);
                ad.played = true;
                playerInstance.adFinished = false;
            };

            playerInstance.switchPlayerToVastMode = () => {
                // Get the actual duration from the video file if it is not present in the VAST XML
                if (!playerInstance.vastOptions.duration) {
                    playerInstance.vastOptions.duration = selectedMediaFile.delivery === 'streaming' ?
                        Infinity : playerInstance.domRef.player.duration;
                }

                if (playerInstance.displayOptions.layoutControls.showCardBoardView) {

                    if (!ad.landingPage) {
                        playerInstance.addCTAButton(ad.clickthroughUrl);
                    } else {
                        playerInstance.addCTAButton(ad.landingPage);
                    }

                } else {

                    const addClickthroughLayer = (typeof ad.adClickable != "undefined") ? ad.adClickable : playerInstance.displayOptions.vastOptions.adClickable;

                    if (addClickthroughLayer) {
                        playerInstance.addClickthroughLayer(playerInstance.videoPlayerId);
                    }

                    playerInstance.addCTAButton(ad.landingPage);

                }

                if (playerInstance.vastOptions.skipoffset !== false) {
                    playerInstance.addSkipButton();
                }

                playerInstance.domRef.player.loop = false;

                playerInstance.addAdCountdown();

                playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

                playerInstance.vastLogoBehaviour(true);

                const progressbarContainer = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = playerInstance.displayOptions.layoutControls.adProgressColor;
                }

                if (playerInstance.rollsById[ad.rollListId].adText || ad.adText) {
                    const adTextToShow = ad.adText ? ad.adText : playerInstance.rollsById[ad.rollListId].adText;
                    playerInstance.addAdPlayingText(adTextToShow);
                }

                playerInstance.positionTextElements(ad);

                playerInstance.toggleLoader(false);
                ad.played = true;
                playerInstance.adFinished = false;
                playerInstance.domRef.player.play();

                //Announce the impressions
                playerInstance.trackSingleEvent('impression');

                playerInstance.domRef.player.removeEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);

                // if in vr mode then do not show
                if (playerInstance.vrMode) {
                    const adCountDownTimerText = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
                    const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
                    const addAdPlayingTextOverlay = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
                    const skipBtn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

                    if (adCountDownTimerText) {
                        adCountDownTimerText.style.display = 'none';
                    }

                    if (ctaButton) {
                        ctaButton.style.display = 'none';
                    }

                    if (addAdPlayingTextOverlay) {
                        addAdPlayingTextOverlay.style.display = 'none';
                    }

                    if (skipBtn) {
                        skipBtn.style.display = 'none';
                    }
                }
            };

            playerInstance.domRef.player.pause();

            // Remove the streaming objects to prevent errors on the VAST content
            playerInstance.detachStreamers();

            // Try to load multiple
            const selectedMediaFile = playerInstance.getSupportedMediaFileObject(playerInstance.vastOptions.mediaFileList);

            // if player in cardboard mode then, linear ads media type should be a '360' video
            if (playerInstance.displayOptions.layoutControls.showCardBoardView && ad.mediaType !== '360') {
                ad.error = true;
                playerInstance.playMainVideoWhenVastFails(403);
                return false;
            }

            const isVpaid = playerInstance.vastOptions.vpaid;

            if (!isVpaid && selectedMediaFile.isUnsuportedHls) {
                import(/* webpackChunkName: "hlsjs" */ 'hls.js').then((it) => {
                    window.Hls = it.default;
                    const hls = new Hls({
                        debug: typeof FP_DEBUG !== 'undefined' && FP_DEBUG === true,
                        p2pConfig: {
                            logLevel: false,
                        },
                        enableWebVTT: false,
                        enableCEA708Captions: false,
                    });

                    hls.attachMedia(playerInstance.domRef.player);
                    hls.loadSource(selectedMediaFile.src);
                    playerInstance.isCurrentlyPlayingAd = true;

                    playerInstance.hlsPlayer = hls;

                    playerInstance.domRef.player.addEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);
                    playerInstance.domRef.player.addEventListener('ended', () => {
                        hls.detachMedia();
                        hls.destroy();
                        playerInstance.hlsPlayer = false;
                        playerInstance.onVastAdEnded();
                    });

                    playerInstance.domRef.player.play();
                });
            } else if (!isVpaid) {
                if (selectedMediaFile.src === false) {
                    // Couldn’t find MediaFile that is supported by this video player, based on the attributes of the MediaFile element.
                    ad.error = true;
                    playerInstance.playMainVideoWhenVastFails(403);
                    return false;
                }

                playerInstance.domRef.player.addEventListener('loadedmetadata', playerInstance.switchPlayerToVastMode);

                playerInstance.domRef.player.src = selectedMediaFile.src;
                playerInstance.isCurrentlyPlayingAd = true;

                if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                    playerInstance.hideAdMarkers();
                }

                playerInstance.domRef.player.load();

                //Handle the ending of the Pre-Roll ad
                playerInstance.domRef.player.addEventListener('ended', playerInstance.onVastAdEnded);

            } else {
                playerInstance.loadVpaid(ad, selectedMediaFile.src);

                if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                    playerInstance.hideAdMarkers();
                }
            }
        };

        /**
         * Sends requests to the tracking URIs
         */
        const videoPlayerTimeUpdate = () => {
            if (playerInstance.adFinished) {
                playerInstance.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                return;
            }

            const currentTime = Math.floor(playerInstance.domRef.player.currentTime);
            if (playerInstance.vastOptions.duration !== 0) {
                playerInstance.scheduleTrackingEvent(currentTime, playerInstance.vastOptions.duration);
            }

            if (currentTime >= (playerInstance.vastOptions.duration - 1) && playerInstance.vastOptions.duration !== 0) {
                playerInstance.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                playerInstance.adFinished = true;
            }

        };

        playVideoPlayer(ad);

        playerInstance.domRef.player.addEventListener('timeupdate', videoPlayerTimeUpdate);

    };

    playerInstance.playRoll = (adList) => {
        // register all the ad pods
        for (let i = 0; i < adList.length; i++) {
            playerInstance.temporaryAdPods.push(adList[i]);
        }

        if (playerInstance.vastOptions !== null && playerInstance.vastOptions.adType.toLowerCase() === 'linear') {
            return;
        }

        const adToPlay = playerInstance.getNextAdPod();

        if (adToPlay !== null) {
            playerInstance.renderLinearAd(adToPlay, true);
        }
    };

    playerInstance.backupMainVideoContentTime = (rollListId) => {
        const roll = playerInstance.rollsById[rollListId].roll;

        //spec configs by roll
        switch (roll) {
            case 'midRoll':
                playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.domRef.player.currentTime - 1;
                break;

            case 'postRoll':
                playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.mainVideoDuration;
                playerInstance.autoplayAfterAd = false;
                playerInstance.domRef.player.currentTime = playerInstance.mainVideoDuration;
                break;

            case 'preRoll':
                if (playerInstance.domRef.player.currentTime > 0) {
                    playerInstance.domRef.player.mainVideoCurrentTime = playerInstance.domRef.player.currentTime - 1;
                }
                break;
        }
    };

    playerInstance.getSupportedMediaFileObject = (mediaFiles) => {
        let selectedMediaFile = null;
        let adSupportedType = false;
        if (mediaFiles.length) {
            for (let i = 0; i < mediaFiles.length; i++) {

                if (mediaFiles[i].apiFramework !== 'VPAID') {
                    const supportLevel = playerInstance.getMediaFileTypeSupportLevel(mediaFiles[i]['type']);

                    if (supportLevel === 'maybe' || supportLevel === 'probably') {
                        selectedMediaFile = mediaFiles[i];
                        adSupportedType = true;
                    }

                    //one of the best(s) option, no need to seek more
                    if (supportLevel === 'probably') {
                        break;
                    }

                    if (
                        supportLevel === 'no' && mediaFiles[i].delivery === 'streaming' &&
                        (mediaFiles[i].type === 'application/vnd.apple.mpegurl' || mediaFiles[i].type === 'application/x-mpegURL')
                    ) {
                        selectedMediaFile = mediaFiles[i];
                        selectedMediaFile.isUnsuportedHls = true;
                        adSupportedType = true;
                    }

                } else {
                    selectedMediaFile = mediaFiles[i];
                    adSupportedType = true;
                    break;
                }
            }
        }

        if (adSupportedType === false) {
            return false;
        }

        return selectedMediaFile;
    };

    /**
     * Reports how likely it is that the current browser will be able to play media of a given MIME type.
     * @return string|null "probably", "maybe", "no" or null
     */
    playerInstance.getMediaFileTypeSupportLevel = (mediaType) => {
        if (null === mediaType) {
            return null;
        }

        const tmpVideo = document.createElement('video');
        let response = tmpVideo.canPlayType(mediaType);

        return !response ? "no" : response;
    };

    playerInstance.scheduleTrackingEvent = (currentTime, duration) => {
        if (currentTime === 0) {
            playerInstance.trackSingleEvent('start');
        }

        if ((typeof playerInstance.vastOptions.tracking['progress'] !== 'undefined') &&
            (playerInstance.vastOptions.tracking['progress'].length) &&
            (typeof playerInstance.vastOptions.tracking['progress'][currentTime] !== 'undefined')) {

            playerInstance.trackSingleEvent('progress', currentTime);
        }

        if (currentTime === (Math.floor(duration / 4))) {
            playerInstance.trackSingleEvent('firstQuartile');
        }

        if (currentTime === (Math.floor(duration / 2))) {
            playerInstance.trackSingleEvent('midpoint');
        }

        if (currentTime === (Math.floor(duration * 3 / 4))) {
            playerInstance.trackSingleEvent('thirdQuartile');
        }

        if (currentTime >= (duration - 1)) {
            playerInstance.trackSingleEvent('complete');
        }
    };


    // ADS
    playerInstance.trackSingleEvent = (eventType, eventSubType) => {
        if (typeof playerInstance.vastOptions === 'undefined' || playerInstance.vastOptions === null) {
            return;
        }

        let trackingUris = [];
        trackingUris.length = 0;

        switch (eventType) {
            case 'start':
            case 'firstQuartile':
            case 'midpoint':
            case 'thirdQuartile':
            case 'complete':
                if (playerInstance.vastOptions.stopTracking[eventType] === false) {
                    if (playerInstance.vastOptions.tracking[eventType] !== null) {
                        trackingUris = playerInstance.vastOptions.tracking[eventType];
                    }

                    playerInstance.vastOptions.stopTracking[eventType] = true;
                }
                break;

            case 'progress':
                playerInstance.vastOptions.tracking['progress'][eventSubType].elements.forEach(function (currentValue, index) {
                    if (
                        (playerInstance.vastOptions.tracking['progress'][eventSubType].stopTracking === false) &&
                        (playerInstance.vastOptions.tracking['progress'][eventSubType].elements.length)
                    ) {
                        trackingUris = playerInstance.vastOptions.tracking['progress'][eventSubType].elements;
                    }

                    playerInstance.vastOptions.tracking['progress'][eventSubType].stopTracking = true;
                });
                break;

            case 'impression':
                if (
                    (typeof playerInstance.vastOptions.impression !== 'undefined') &&
                    (playerInstance.vastOptions.impression !== null) &&
                    (typeof playerInstance.vastOptions.impression.length !== 'undefined')
                ) {
                    trackingUris = playerInstance.vastOptions.impression;
                }
                break;

            default:
                break;
        }

        playerInstance.callUris(trackingUris);
    };

    // ADS
    playerInstance.completeNonLinearStatic = (ad) => {
        playerInstance.closeNonLinear(ad.id);
        if (playerInstance.adFinished === false) {
            playerInstance.adFinished = true;
            playerInstance.trackSingleEvent('complete');
        }
        clearInterval(playerInstance.nonLinearTracking);
    };

    // ADS
    /**
     * Show up a nonLinear static creative
     */
    playerInstance.createNonLinearStatic = (ad) => {
        //get the proper ad
        playerInstance.vastOptions = ad;
        playerInstance.createBoard(ad);
        if (playerInstance.rollsById[ad.rollListId].error === true || ad.error === true) {
            playerInstance.announceLocalError(101);
            return;
        }
        playerInstance.adFinished = false;
        let duration = (playerInstance.rollsById[ad.rollListId].nonLinearDuration) ? playerInstance.rollsById[ad.rollListId].nonLinearDuration : false;
        if (!playerInstance.vastOptions.vpaid) {
            playerInstance.trackSingleEvent('start');
            duration = duration || playerInstance.vastOptions.duration;

            playerInstance.nonLinearTracking = setInterval(function () {
                if (playerInstance.adFinished === true) {
                    return;
                }

                const currentTime = Math.floor(playerInstance.domRef.player.currentTime);
                playerInstance.scheduleTrackingEvent(currentTime, duration);
                if (currentTime >= (duration - 1)) {
                    playerInstance.adFinished = true;
                }
            }, 400);
        }

        const time = parseInt(playerInstance.getCurrentTime()) + parseInt(duration);
        playerInstance.scheduleTask({ time: time, closeStaticAd: ad, rollListId: ad.rollListId });
    };

    // ADS
    playerInstance.createVpaidNonLinearBoard = (ad) => {
        // create iframe
        // pass the js

        playerInstance.loadVpaidNonlinearAssets = function (ad) {

            playerInstance.debugMessage('starting function switchPlayerToVpaidMode');

            const vAlign = (ad.vAlign) ? ad.vAlign : playerInstance.nonLinearVerticalAlign;
            const showCloseButton = (ad.vpaidNonLinearCloseButton) ? ad.vpaidNonLinearCloseButton : playerInstance.vpaidNonLinearCloseButton;
            const vpaidIframe = playerInstance.videoPlayerId + "_" + ad.id + "_fluid_vpaid_iframe";
            const creativeData = {};
            creativeData.AdParameters = ad.adParameters;
            const slotWrapper = document.createElement('div');
            slotWrapper.id = 'fluid_vpaidNonLinear_' + ad.id;
            slotWrapper.className = 'fluid_vpaidNonLinear_' + vAlign;
            slotWrapper.className += ' fluid_vpaidNonLinear_ad';
            slotWrapper.setAttribute('adListId', ad.id);

            // Default values in case nothing defined in VAST data or ad settings
            let adWidth = Math.min(468, playerInstance.domRef.player.offsetWidth);
            let adHeight = Math.min(60, Math.floor(playerInstance.domRef.player.offsetHeight / 4));

            if (typeof ad.size !== 'undefined') {
                const dimensions = ad.size.split('x');
                adWidth = dimensions[0];
                adHeight = dimensions[1];
            } else if (ad.dimension.width && ad.dimension.height) {
                adWidth = ad.dimension.width;
                adHeight = ad.dimension.height;
            }

            slotWrapper.style.width = '100%';
            slotWrapper.style.height = adHeight + 'px';

            let slotFrame;
            if (showCloseButton) {
                const slotFrame = document.createElement('div');
                slotFrame.className = 'fluid_vpaidNonLinear_frame';
                slotFrame.style.width = adWidth + 'px';
                slotFrame.style.height = adHeight + 'px';
                slotWrapper.appendChild(slotFrame);

                const closeBtn = document.createElement('div');
                closeBtn.id = 'close_button_' + playerInstance.videoPlayerId;
                closeBtn.className = 'close_button';
                closeBtn.innerHTML = '';
                closeBtn.title = playerInstance.displayOptions.layoutControls.closeButtonCaption;
                const [tempadListId] = ad.id.split('_');
                closeBtn.onclick = function (event) {

                    playerInstance.hardStopVpaidAd('');

                    if (typeof event.stopImmediatePropagation !== 'undefined') {
                        event.stopImmediatePropagation();
                    }
                    playerInstance.adFinished = true;

                    //if any other onPauseRoll then render it
                    if (playerInstance.rollsById[tempadListId].roll === 'onPauseRoll' && playerInstance.onPauseRollAdPods[0]) {
                        const getNextOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                        playerInstance.createBoard(getNextOnPauseRollAd);
                        playerInstance.currentOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                        delete playerInstance.onPauseRollAdPods[0];
                    }

                    return false;
                };

                slotFrame.appendChild(closeBtn);

            }

            const slotIframe = document.createElement('iframe');
            slotIframe.id = playerInstance.videoPlayerId + "non_linear_vapid_slot_iframe";
            slotIframe.className = 'fluid_vpaid_nonlinear_slot_iframe';
            slotIframe.setAttribute('width', adWidth + 'px');
            slotIframe.setAttribute('height', adHeight + 'px');
            slotIframe.setAttribute('sandbox', 'allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
            slotIframe.setAttribute('frameborder', '0');
            slotIframe.setAttribute('scrolling', 'no');
            slotIframe.setAttribute('marginwidth', '0');
            slotIframe.setAttribute('marginheight', '0');
            slotWrapper.appendChild(slotIframe);

            playerInstance.domRef.player.parentNode.insertBefore(slotWrapper, vpaidIframe.nextSibling);

            const slotElement = slotIframe.contentWindow.document.createElement('div');

            slotIframe.contentWindow.document.body.appendChild(slotElement);

            playerInstance.vastOptions.slotIframe = slotIframe;
            playerInstance.vastOptions.slotFrame = slotFrame;

            const environmentVars = {
                slot: slotElement,
                videoSlot: playerInstance.domRef.player,
                videoSlotCanAutoPlay: true
            };

            playerInstance.debugMessage(ad);

            // calls this functions after ad unit is loaded in iframe
            const ver = playerInstance.vpaidAdUnit.handshakeVersion(VPAID_VERSION);
            const compare = playerInstance.compareVersion(VPAID_VERSION, ver);
            if (compare === 1) {
                //VPAID version of ad is lower than we need
                ad.error = true;
                playerInstance.playMainVideoWhenVpaidFails(403);
                return false;
            }

            playerInstance.domRef.player.loop = false;
            playerInstance.domRef.player.removeAttribute('controls'); //Remove the default Controls

            playerInstance.vpaidCallbackListenersAttach();
            const mode = (playerInstance.fullscreenMode ? 'fullscreen' : 'normal');
            playerInstance.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

            playerInstance.toggleLoader(false);
            ad.played = true;
            playerInstance.adFinished = false;
        };

        playerInstance.loadVpaid(ad, ad.staticResource);

        playerInstance.debugMessage('create non linear vpaid');
    };

    // ADS
    playerInstance.createNonLinearBoard = (ad) => {
        ad.played = true;
        const playerWidth = playerInstance.domRef.player.clientWidth;
        const board = document.createElement('div');
        const vAlign = (playerInstance.rollsById[ad.rollListId].vAlign) ? playerInstance.rollsById[ad.rollListId].vAlign : playerInstance.nonLinearVerticalAlign;

        const creative = new Image();
        creative.src = ad.staticResource;
        creative.id = 'fluid_nonLinear_imgCreative_' + ad.id + '_' + playerInstance.videoPlayerId;

        creative.onerror = function () {
            playerInstance.rollsById[ad.rollListId].error = true;
            playerInstance.announceError(500);
        };

        creative.onload = function () {
            let origWidth;
            let origHeight;
            let newBannerWidth;
            let newBannerHeight;

            //Set banner size based on the below priority
            // 1. adList -> roll -> size
            // 2. VAST XML width/height attriubute (VAST 3.)
            // 3. VAST XML static resource dimension
            if (typeof playerInstance.rollsById[ad.rollListId].size !== 'undefined') {
                origWidth = playerInstance.rollsById[ad.rollListId].size.split('x')[0];
                origHeight = playerInstance.rollsById[ad.rollListId].size.split('x')[1];
            } else if (ad.dimension.width && ad.dimension.height) {
                origWidth = ad.dimension.width;
                origHeight = ad.dimension.height;
            } else {
                origWidth = creative.width;
                origHeight = creative.height;
            }

            if (origWidth > playerWidth) {
                newBannerWidth = playerWidth - 5;
                newBannerHeight = origHeight * newBannerWidth / origWidth;
            } else {
                newBannerWidth = origWidth;
                newBannerHeight = origHeight;
            }

            if (playerInstance.rollsById[ad.rollListId].roll !== 'onPauseRoll') {
                //Show the board only if media loaded
                document.getElementById('fluid_nonLinear_' + ad.id).style.display = '';
            }

            const img = document.getElementById(creative.id);
            img.width = newBannerWidth;
            img.height = newBannerHeight;

            playerInstance.trackSingleEvent('impression');
        };

        board.id = 'fluid_nonLinear_' + ad.id;
        board.className = 'fluid_nonLinear_' + vAlign;
        board.className += ' fluid_nonLinear_ad';
        board.innerHTML = creative.outerHTML;
        board.style.display = 'none';

        //Bind the Onclick event
        board.onclick = function () {
            if (typeof ad.clickthroughUrl !== 'undefined') {
                window.open(ad.clickthroughUrl);
            }

            //Tracking the NonLinearClickTracking events
            if (typeof ad.clicktracking !== 'undefined') {
                playerInstance.callUris([ad.clicktracking]);
            }
        };

        if (typeof ad.clickthroughUrl !== 'undefined') {
            board.style.cursor = 'pointer';
        }

        const closeBtn = document.createElement('div');
        closeBtn.id = 'close_button_' + playerInstance.videoPlayerId;
        closeBtn.className = 'close_button';
        closeBtn.innerHTML = '';
        closeBtn.title = playerInstance.displayOptions.layoutControls.closeButtonCaption;
        const tempRollListId = ad.rollListId;
        closeBtn.onclick = function (event) {
            this.parentElement.remove();
            if (typeof event.stopImmediatePropagation !== 'undefined') {
                event.stopImmediatePropagation();
            }
            playerInstance.adFinished = true;
            clearInterval(playerInstance.nonLinearTracking);

            //if any other onPauseRoll then render it
            if (playerInstance.rollsById[tempRollListId].roll === 'onPauseRoll' && playerInstance.onPauseRollAdPods[0]) {
                const getNextOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                playerInstance.createBoard(getNextOnPauseRollAd);
                playerInstance.currentOnPauseRollAd = playerInstance.onPauseRollAdPods[0];
                delete playerInstance.onPauseRollAdPods[0];
            }

            return false;
        };

        board.appendChild(closeBtn);
        playerInstance.domRef.player.parentNode.insertBefore(board, playerInstance.domRef.player.nextSibling);
    };

    // ADS
    /**
     * Adds a nonLinear static Image banner
     *
     * currently only image/gif, image/jpeg, image/png supported
     */
    playerInstance.createBoard = (ad) => {
        // create nonLinear Vpaid
        // create nonLinear regular
        if (ad.vpaid) {
            playerInstance.hardStopVpaidAd('');
            playerInstance.createVpaidNonLinearBoard(ad);
        } else {
            if (
                typeof ad.staticResource === 'undefined' ||
                playerInstance.supportedStaticTypes.indexOf(ad.creativeType) === -1
            ) {
                // Couldn’t find NonLinear resource with supported type.
                ad.error = true;

                if (!playerInstance.vastOptions || typeof playerInstance.vastOptions.errorUrl === 'undefined') {
                    playerInstance.announceLocalError(503);
                } else {
                    playerInstance.announceError(503);
                }

                return;
            }
            playerInstance.createNonLinearBoard(ad);
        }
    };

    playerInstance.closeNonLinear = (adId) => {
        const element = document.querySelector('#fluid_nonLinear_' + adId + ', #fluid_vpaidNonLinear_' + adId);
        if (element) {
            element.remove();
        }
    };

    playerInstance.rollGroupContainsLinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (playerInstance.rollsById[groupedRolls[i].id].adType && playerInstance.rollsById[groupedRolls[i].id].adType === 'linear') {
                found = true;
                break;
            }
        }
        return found;
    };
    playerInstance.rollGroupContainsNonlinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (playerInstance.rollsById[groupedRolls[i].id].adType.toLowerCase() === 'nonlinear') {
                found = true;
                break;
            }
        }
        return found;
    };

    playerInstance.preRollFail = () => {
        const preRollsLength = playerInstance.preRollAdPodsLength;

        playerInstance.preRollVastResolved++;

        if (playerInstance.preRollVastResolved === preRollsLength) {
            playerInstance.preRollAdsPlay();
        }
    };

    playerInstance.preRollSuccess = () => {
        const preRollsLength = playerInstance.preRollAdPodsLength;

        playerInstance.preRollVastResolved++;

        if (playerInstance.preRollVastResolved === preRollsLength) {
            playerInstance.preRollAdsPlay();
        }
    };

    playerInstance.preRollAdsPlay = () => {
        const time = 0;
        const rollListIds = playerInstance.preRollAdPods;
        const adsByType = {
            linear: [],
            nonLinear: []
        };

        playerInstance.firstPlayLaunched = true;

        for (let index = 0; index < rollListIds.length; index++) {
            playerInstance.rollsById[rollListIds[index]].ads.forEach(ad => {
                if (ad.played === true) {
                    return;
                }

                if (ad.adType === 'linear') {
                    adsByType.linear.push(ad);
                }

                if (ad.adType === 'nonLinear') {
                    adsByType.nonLinear.push(ad);
                    playerInstance.scheduleTask({time: time, playRoll: 'midRoll', rollListId: ad.rollListId });
                }
            });

        }

        if (adsByType.linear.length > 0) {
            playerInstance.toggleLoader(false);
            playerInstance.playRoll(adsByType.linear);
        } else {
            playerInstance.playMainVideoWhenVastFails(900);
        }

    };

    playerInstance.preRoll = (event) => {
        const vastObj = event.vastObj;
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.preRoll);

        const rollListIds = [];
        rollListIds[0] = event.type.replace('adId_', '');
        const time = 0;

        if (playerInstance.rollsById[rollListIds[0]].played === true) {
            return;
        }

        playerInstance.preRollAdPods.push(rollListIds[0]);

        playerInstance.preRollSuccess(vastObj);
    };

    playerInstance.createAdMarker = (adListId, time) => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarker = document.createElement('div');
        adMarker.id = 'ad_marker_' + playerInstance.videoPlayerId + "_" + adListId;
        adMarker.className = 'fluid_controls_ad_marker';
        adMarker.style.left = (time / playerInstance.mainVideoDuration * 100) + '%';
        if (playerInstance.isCurrentlyPlayingAd) {
            adMarker.style.display = 'none';
        }
        markersHolder.appendChild(adMarker);
    };

    playerInstance.hideAdMarker = (adListId) => {
        const element = document.getElementById('ad_marker_' + playerInstance.videoPlayerId + "_" + adListId);
        if (element) {
            element.style.display = 'none';
        }
    };

    playerInstance.showAdMarkers = () => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        const idPrefix = 'ad_marker_' + playerInstance.videoPlayerId + "_";
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            const rollListId = item.id.replace(idPrefix, '');
            if (playerInstance.rollsById[rollListId].played === false) {
                item.style.display = '';
            }
        }
    };

    playerInstance.hideAdMarkers = () => {
        const markersHolder = document.getElementById(playerInstance.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            item.style.display = 'none';
        }
    };

    playerInstance.midRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.midRoll);

        const rollListId = event.type.replace('adId_', '');
        if (playerInstance.rollsById[rollListId].played === true) {
            return;
        }

        let time = playerInstance.rollsById[rollListId].timer;

        if (typeof time == 'string' && time.indexOf("%") !== -1) {
            time = time.replace('%', '');
            time = Math.floor(playerInstance.mainVideoDuration / 100 * time);
        }

        if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers &&
            playerInstance.rollsById[rollListId].adType === "nonLinear") {
            playerInstance.createAdMarker(rollListId, time);
        }

        playerInstance.scheduleTask({
            time: time,
            playRoll: 'midRoll',
            rollListId
        });
    };

    playerInstance.postRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.postRoll);
        const rollListId = event.type.replace('adId_', '');

        playerInstance.scheduleTask({
            time: Math.floor(playerInstance.mainVideoDuration),
            playRoll: 'postRoll',
            rollListId
        });
    };

    playerInstance.onPauseRoll = (event) => {
        playerInstance.domRef.player.removeEventListener(event.type, playerInstance.onPauseRoll);
        const rollListId = event.type.replace('adId_', '');

        playerInstance.rollsById[rollListId].ads.forEach(ad => {
            if (ad.adType === 'nonLinear') {
                if (playerInstance.rollsById[ad.rollListId].error === true || ad.error === true) {
                    playerInstance.announceLocalError(101);
                    return;
                }

                const nonLinearAdExists = document.getElementsByClassName('fluid_nonLinear_ad')[0];
                if (!nonLinearAdExists) {
                    playerInstance.createBoard(ad);
                    playerInstance.currentOnPauseRollAd = rollListId;
                    let onPauseAd = document.getElementById('fluid_nonLinear_' + rollListId);
                    if (onPauseAd) {
                        onPauseAd.style.display = 'none';
                    }
                } else {
                    playerInstance.onPauseRollAdPods.push(rollListId);
                }

            }
        });
    };

    /**
     * Check if player has a valid nonLinear onPause Ad
     */
    playerInstance.hasValidOnPauseAd = () => {
        // TODO should be only one. Add validator to allow only one onPause roll
        const onPauseAd = playerInstance.findRoll('onPauseRoll');

        return (
            onPauseAd.length !== 0 &&
            playerInstance.rollsById[onPauseAd[0]] &&
            playerInstance.rollsById[onPauseAd[0]].error === false &&
            playerInstance.rollsById[onPauseAd[0]].ads.length &&
            playerInstance.rollsById[onPauseAd[0]].ads[0].error !== true
        );
    };

    /**
     * Hide/show nonLinear onPause Ad
     */
    playerInstance.toggleOnPauseAd = () => {
        playerInstance.toggleLoader(false);
        if (playerInstance.hasValidOnPauseAd() && !playerInstance.isCurrentlyPlayingAd) {
            const onPauseRoll = playerInstance.findRoll('onPauseRoll');
            const ad = playerInstance.rollsById[onPauseRoll].ads[0];

            playerInstance.vastOptions = ad;
            const onPauseAd = document.getElementById('fluid_nonLinear_' + ad.id);

            if (onPauseAd && playerInstance.domRef.player.paused) {
                setTimeout(function () {
                    onPauseAd.style.display = 'flex';
                    ad.played = false;
                    playerInstance.trackingOnPauseNonLinearAd(ad, 'start');
                }, 500);
            } else if (onPauseAd && !playerInstance.domRef.player.paused) {
                onPauseAd.style.display = 'none';
                playerInstance.adFinished = true;
                playerInstance.trackingOnPauseNonLinearAd(ad, 'complete');
            }
        }
    };

    /**
     * Helper function for tracking onPause Ads
     */
    playerInstance.trackingOnPauseNonLinearAd = (ad, status) => {
        if (playerInstance.rollsById[ad.rollListId].error === true || ad.error === true) {
            playerInstance.announceLocalError(101);
            return;
        }

        playerInstance.vastOptions = ad;
        playerInstance.trackSingleEvent(status);
    };

    playerInstance.getLinearAdsFromKeyTime = (keyTimeLinearObj) => {
        const adListIds = [];

        for (let i = 0; i < keyTimeLinearObj.length; i++) {
            if (playerInstance.rollsById[keyTimeLinearObj[i].adListId].played === false) {
                adListIds.push(keyTimeLinearObj[i].adListId);
            }
        }

        return adListIds;
    };

    playerInstance.adKeytimePlay = (keyTime) => {
        if (!playerInstance.timerPool[keyTime] || playerInstance.isCurrentlyPlayingAd) {
            return;
        }

        const timerPoolKeytimeCloseStaticAdsLength = playerInstance.timerPool[keyTime]['closeStaticAd'].length;
        const timerPoolKeytimeLinearAdsLength = playerInstance.timerPool[keyTime]['linear'].length;
        const timerPoolKeytimeNonlinearAdsLength = playerInstance.timerPool[keyTime]['nonLinear'].length;

        // remove the item from keytime if no ads to play
        if (timerPoolKeytimeCloseStaticAdsLength === 0 && timerPoolKeytimeLinearAdsLength === 0 && timerPoolKeytimeNonlinearAdsLength === 0) {
            delete playerInstance.timerPool[keyTime];
            return;
        }

        // Task: close nonLinear ads
        if (timerPoolKeytimeCloseStaticAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeCloseStaticAdsLength; index++) {
                const adToClose = playerInstance.timerPool[keyTime]['closeStaticAd'][index];
                if (adToClose.played === true) {
                    playerInstance.completeNonLinearStatic(adToClose);
                }
            }

            // empty closeStaticAd from the timerpool after closing
            playerInstance.timerPool[keyTime]['closeStaticAd'] = [];
        }

        // Task: play linear ads
        if (timerPoolKeytimeLinearAdsLength > 0) {
            if (playerInstance.timerPool[keyTime]['linear'].length > 0) {
                playerInstance.playRoll(playerInstance.timerPool[keyTime]['linear']);

                // empty the linear ads from the timerpool after played
                playerInstance.timerPool[keyTime]['linear'] = [];

                // return after starting video ad, so non-linear will not overlap
                return;
            }
        }

        // Task: play nonLinear ads
        if (timerPoolKeytimeNonlinearAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeNonlinearAdsLength; index++) {
                const ad = playerInstance.timerPool[keyTime]['nonLinear'][index];
                const rollListId = ad.rollListId;
                const vastOptions = playerInstance.adPool[rollListId];

                // we are not supporting nonLinear ads in cardBoard mode
                if (ad.played === false && !playerInstance.displayOptions.layoutControls.showCardBoardView) {
                    playerInstance.createNonLinearStatic(ad);
                    if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
                        playerInstance.hideAdMarker(ad);
                    }

                    // delete nonLinear after playing
                    playerInstance.timerPool[keyTime]['nonLinear'].splice(index, 1);

                    // return after starting non-linear ad, so multiple non-linear will not overlap
                    // unplayed non-linear will appear if user seeks back to the time :)
                    return;
                }
            }
        }

    };

    playerInstance.adTimer = () => {
        if (!!playerInstance.isTimer) {
            return;
        }

        playerInstance.isTimer = !playerInstance.isTimer;

        playerInstance.timer = setInterval(
            function () {
                const keyTime = Math.floor(playerInstance.getCurrentTime());
                playerInstance.adKeytimePlay(keyTime)
            }, 800);
    };

    // ADS
    playerInstance.scheduleTask = (task) => {
        if (!playerInstance.timerPool.hasOwnProperty(task.time)) {
            playerInstance.timerPool[task.time] = {linear: [], nonLinear: [], closeStaticAd: []};
        }

        const roll = playerInstance.rollsById[task.rollListId];

        roll.ads
            .filter(({ adType }) => {
                if (task.time === 0) { // Only non-linear should be scheduled on "preRoll"
                    return adType !== 'linear';
                }

                return true;
            })
            .forEach(ad => {
                if (task.hasOwnProperty('playRoll') && ad.adType === 'linear') {
                    playerInstance.timerPool[task.time]['linear'].push(ad);
                } else if (task.hasOwnProperty('playRoll') && ad.adType === 'nonLinear') {
                    playerInstance.timerPool[task.time]['nonLinear'].push(ad);
                } else if (task.hasOwnProperty('closeStaticAd')) {
                    playerInstance.timerPool[task.time]['closeStaticAd'].push(ad);
                }
            });

    };

    // ADS
    playerInstance.switchToMainVideo = () => {
        playerInstance.debugMessage('starting main video');

        playerInstance.domRef.player.src = playerInstance.originalSrc;

        playerInstance.initialiseStreamers();

        const newCurrentTime = (typeof playerInstance.domRef.player.mainVideoCurrentTime !== 'undefined')
            ? Math.floor(playerInstance.domRef.player.mainVideoCurrentTime) : 0;

        if (playerInstance.domRef.player.hasOwnProperty('currentTime')) {
            playerInstance.domRef.player.currentTime = newCurrentTime;
        }

        if (playerInstance.displayOptions.layoutControls.loop) {
            playerInstance.domRef.player.loop = true;
        }

        playerInstance.setCurrentTimeAndPlay(newCurrentTime, playerInstance.autoplayAfterAd);

        playerInstance.isCurrentlyPlayingAd = false;

        playerInstance.deleteVastAdElements();

        playerInstance.adFinished = true;
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        playerInstance.vastOptions = null;

        playerInstance.setBuffering();
        const progressbarContainer = document.getElementById(playerInstance.videoPlayerId + '_fluid_controls_progress_container');

        if (progressbarContainer !== null) {
            const backgroundColor = (playerInstance.displayOptions.layoutControls.primaryColor) ? playerInstance.displayOptions.layoutControls.primaryColor : "white";

            const currentProgressBar = playerInstance.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');

            for (let i = 0; i < currentProgressBar.length; i++) {
                currentProgressBar[i].style.backgroundColor = backgroundColor;
            }
        }

        playerInstance.domRef.player.removeEventListener('ended', playerInstance.onVastAdEnded);

        if (playerInstance.displayOptions.vastOptions.showProgressbarMarkers) {
            playerInstance.showAdMarkers();
        }

        if (playerInstance.hasTitle()) {
            const title = document.getElementById(playerInstance.videoPlayerId + '_title');
            title.style.display = 'inline';
        }
    };

    // ADS
    playerInstance.getNextAdPod = () => {
        if (playerInstance.temporaryAdPods.length > 0) {
            return playerInstance.temporaryAdPods.shift();
        }

        return null;
    };

    // ADS
    playerInstance.checkForNextAd = () => {
        const availableNextAdID = playerInstance.getNextAdPod();
        if (availableNextAdID === null) {
            playerInstance.switchToMainVideo();
            playerInstance.vastOptions = null;
            playerInstance.adFinished = true;
        } else {
            playerInstance.domRef.player.removeEventListener('ended', playerInstance.onVastAdEnded);
            playerInstance.isCurrentlyPlayingAd = false;
            playerInstance.vastOptions = null;
            playerInstance.adFinished = true;
            playerInstance.renderLinearAd(availableNextAdID, false); // passing false so it doesn't backup the Ad playbacktime as video playback time
        }
    };


    /**
     * Adds a Skip Button
     */
    playerInstance.addSkipButton = () => {
        // TODO: ahh yes, the DIVbutton...
        const divSkipButton = document.createElement('div');
        divSkipButton.id = 'skip_button_' + playerInstance.videoPlayerId;
        divSkipButton.className = 'skip_button skip_button_disabled';
        if (playerInstance.vastOptions.skipoffset > 0) {
            divSkipButton.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', playerInstance.vastOptions.skipoffset);
        }

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(divSkipButton);

        if (playerInstance.vastOptions.skipoffset === 0) {
            playerInstance.decreaseSkipOffset();
        }

        playerInstance.domRef.player.addEventListener('timeupdate', playerInstance.decreaseSkipOffset, false);
    };

    /**
     * Ad Countdown
     */
    playerInstance.addAdCountdown = () => {
        if ((playerInstance.isCurrentlyPlayingAd && playerInstance.hlsPlayer) || playerInstance.currentVideoDuration === Infinity) {
            return; // Shouldn't show countdown if ad is a video live stream
        }

        const videoWrapper = document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId);
        const divAdCountdown = document.createElement('div');

        // Create element
        const adCountdown = playerInstance.pad(parseInt(playerInstance.currentVideoDuration / 60)) + ':' + playerInstance.pad(parseInt(playerInstance.currentVideoDuration % 60));
        const durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + playerInstance.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "<span class='ad_timer_prefix'>Ad - </span>" + durationText;

        videoWrapper.appendChild(divAdCountdown);

        playerInstance.domRef.player.addEventListener('timeupdate', playerInstance.decreaseAdCountdown, false);
        videoWrapper.addEventListener('mouseover', function () {
            divAdCountdown.style.display = 'none';
        }, false);
    };

    playerInstance.decreaseAdCountdown = function decreaseAdCountdown() {
        const sec = parseInt(playerInstance.currentVideoDuration) - parseInt(playerInstance.domRef.player.currentTime);
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);

        if (btn && isNaN(sec)) {
            btn.parentNode.removeChild(btn);
            return;
        }

        if (btn) {
            btn.innerHTML = "<span class='ad_timer_prefix'>Ad - </span> " + playerInstance.pad(parseInt(sec / 60)) + ':' + playerInstance.pad(parseInt(sec % 60));
        } else {
            playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseAdCountdown);
        }
    };

    playerInstance.removeAdCountdown = () => {
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    playerInstance.toggleAdCountdown = (showing) => {
        const btn = document.getElementById('ad_countdown' + playerInstance.videoPlayerId);
        if (btn) {
            if (showing) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    };

    playerInstance.addAdPlayingText = (textToShow) => {
        const adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = playerInstance.videoPlayerId + '_fluid_ad_playing';

        if (playerInstance.displayOptions.layoutControls.primaryColor) {
            adPlayingDiv.style.backgroundColor = playerInstance.displayOptions.layoutControls.primaryColor;
            adPlayingDiv.style.opacity = 1;
        }

        adPlayingDiv.className = 'fluid_ad_playing';
        adPlayingDiv.innerText = textToShow;

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(adPlayingDiv);
    };

    playerInstance.positionTextElements = (adListData) => {
        const allowedPosition = ['top left', 'top right', 'bottom left', 'bottom right'];

        const skipButton = document.getElementById('skip_button_' + playerInstance.videoPlayerId);
        const adPlayingDiv = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        const ctaButton = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');

        let ctaButtonHeightWithSpacing = 0;
        let adPlayingDivHeightWithSpacing = 0;
        const pixelSpacing = 8;
        let isBottom = false;
        let skipButtonHeightWithSpacing = 0;
        let positionsCTA = [];

        const defaultPositions = {
            top: {
                left: { h: 34, v: 34 },
                right: { h: 0, v: 34 },
            },
            bottom: {
                left: { h: 34, v: 50 },
                right: { h: 0, v: 50 },
            }
        };

        if (skipButton !== null) {
            skipButtonHeightWithSpacing = skipButton.offsetHeight + pixelSpacing;

            const wrapperElement = playerInstance.domRef.wrapper;

            if (wrapperElement.classList.contains('mobile')) {
                defaultPositions.top = {
                    left: { h: 0, v: 8 },
                    right: { h: 0, v: 8 },
                }
                defaultPositions.bottom = {
                    left: { h: 0, v: 50 },
                    right: { h: 0, v: 50 },
                }
            }
        }

        let CTATextPosition;
        if (ctaButton !== null) {
            CTATextPosition = playerInstance.rollsById[adListData.rollListId].adCTATextPosition ?
                playerInstance.rollsById[adListData.rollListId].adCTATextPosition.toLowerCase() :
                playerInstance.displayOptions.vastOptions.adCTATextPosition;

            if (allowedPosition.indexOf(CTATextPosition) === -1) {
                console.log('[FP Error] Invalid position for CTAText. Reverting to "bottom right"');
                CTATextPosition = 'bottom right';
            }

            ctaButton.classList.add.apply(ctaButton.classList, CTATextPosition.split(' '));

            positionsCTA = CTATextPosition.split(' ');

            isBottom = positionsCTA[0] === 'bottom';

            ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + 'px';
            ctaButton.style[positionsCTA[1]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].h + 'px';

            if (isBottom && positionsCTA[1] === 'right') {
                ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + skipButtonHeightWithSpacing + 'px';
            }

            ctaButtonHeightWithSpacing = ctaButton.offsetHeight + pixelSpacing + 'px';
        }

        let adPlayingDivPosition;
        let positionsAdText;
        if (adPlayingDiv !== null) {
            adPlayingDivPosition = playerInstance.rollsById[adListData.rollListId].adTextPosition ?
                playerInstance.rollsById[adListData.rollListId].adTextPosition.toLowerCase() :
                playerInstance.displayOptions.vastOptions.adTextPosition;

            if (allowedPosition.indexOf(adPlayingDivPosition) === -1) {
                console.log('[FP Error] Invalid position for adText. Reverting to "top left"');
                adPlayingDivPosition = 'top left';
            }

            positionsAdText = adPlayingDivPosition.split(' ');
            adPlayingDiv.style[positionsAdText[0]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + 'px';
            adPlayingDiv.style[positionsAdText[1]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].h + 'px';
            adPlayingDivHeightWithSpacing = adPlayingDiv.offsetHeight + pixelSpacing + 'px';
        }

        if (ctaButtonHeightWithSpacing > 0 && adPlayingDivHeightWithSpacing > 0 && CTATextPosition === adPlayingDivPosition) {
            if (isBottom) {
                if (positionsCTA[1] === 'right') {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + skipButtonHeightWithSpacing + ctaButtonHeightWithSpacing + 'px';
                } else {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + ctaButtonHeightWithSpacing + 'px';
                }
            } else {
                ctaButton.style.top = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + adPlayingDivHeightWithSpacing + 'px';
            }
        }
    };

    playerInstance.removeAdPlayingText = () => {
        const div = document.getElementById(playerInstance.videoPlayerId + '_fluid_ad_playing');
        if (!div) {
            return;
        }
        div.parentElement.removeChild(div);
    };

    /**
     * Adds CTA button from VAST, with fallback to IconClickTrough
     *
     * @param {string} landingPage
     */
    playerInstance.addCTAButton = (landingPage) => {
        if (playerInstance.vastOptions.titleCTA) {
            const { text, link, tracking } = playerInstance.vastOptions.titleCTA;
            return playerInstance.createAndAppendCTAButton(text, link, tracking);
        }

        if (landingPage && typeof playerInstance.displayOptions.vastOptions.adCTAText === 'string') {
            return playerInstance.createAndAppendCTAButton(
                playerInstance.displayOptions.vastOptions.adCTAText,
                landingPage,
                playerInstance.vastOptions.clickthroughUrl
            );
        }
    };

    /**
     * Creates and append CTA button given the input parameters
     *
     * @param {string} adCTAText
     *
     * @param {string} displayUrl
     *
     * @param {string} trackingUrl
     */
    playerInstance.createAndAppendCTAButton = (adCTAText, displayUrl, trackingUrl) => {
        const ctaButton = document.createElement('div');
        ctaButton.id = playerInstance.videoPlayerId + '_fluid_cta';
        ctaButton.className = 'fluid_ad_cta';

        const link = document.createElement('span');
        let innerHTML = adCTAText;

        if (displayUrl) {
            innerHTML += "<br/><span class=\"add_icon_clickthrough\">" + displayUrl + "</span>"
        }

        link.innerHTML = innerHTML;

        ctaButton.addEventListener('click', () => {
            if (!playerInstance.domRef.player.paused) {
                playerInstance.domRef.player.pause();
            }

            const win = window.open(trackingUrl, '_blank');
            win.focus();
            return true;
        }, false);

        ctaButton.appendChild(link);

        document.getElementById('fluid_video_wrapper_' + playerInstance.videoPlayerId).appendChild(ctaButton);
    };

    playerInstance.removeCTAButton = () => {
        const btn = document.getElementById(playerInstance.videoPlayerId + '_fluid_cta');
        if (!btn) {
            return;
        }

        btn.parentElement.removeChild(btn);
    };

    playerInstance.decreaseSkipOffset = () => {
        let sec = playerInstance.vastOptions.skipoffset - Math.floor(playerInstance.domRef.player.currentTime);
        const btn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);

        if (!btn) {
            playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseSkipOffset);
            return;
        }

        if (sec >= 1) {
            //set the button label with the remaining seconds
            btn.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', sec);
            return;
        }

        // TODO: refactored, but this is still terrible - remove all this and just make the button clickable...
        const skipLink = document.createElement('a');
        skipLink.href = '#';
        skipLink.id = 'skipHref_' + playerInstance.videoPlayerId;
        skipLink.innerHTML = playerInstance.displayOptions.vastOptions.skipButtonClickCaption;
        skipLink.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            playerInstance.pressSkipButton();
        };

        btn.innerHTML = '';
        btn.appendChild(skipLink);

        //removes the CSS class for a disabled button
        btn.className = btn.className.replace(/\bskip_button_disabled\b/, '');

        playerInstance.domRef.player.removeEventListener('timeupdate', playerInstance.decreaseSkipOffset);
    };

    playerInstance.pressSkipButton = () => {
        playerInstance.removeSkipButton();
        playerInstance.removeAdPlayingText();
        playerInstance.removeCTAButton();

        if (playerInstance.vastOptions.vpaid) {
            // skip the linear vpaid ad
            playerInstance.skipVpaidAd();
            return;
        }

        // skip the regular linear vast
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastVideoSkippedCallback();
        const event = document.createEvent('Event');
        event.initEvent('ended', false, true);
        playerInstance.domRef.player.dispatchEvent(event);
    };

    playerInstance.removeSkipButton = () => {
        const btn = document.getElementById('skip_button_' + playerInstance.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    /**
     * Makes the player open the ad URL on clicking
     */
    playerInstance.addClickthroughLayer = () => {
        const divWrapper = playerInstance.domRef.wrapper;

        const divClickThrough = document.createElement('div');
        divClickThrough.className = 'vast_clickthrough_layer';
        divClickThrough.id = 'vast_clickthrough_layer_' + playerInstance.videoPlayerId;
        divClickThrough.setAttribute(
            'style',
            'position: absolute; cursor: pointer; top: 0; left: 0; width: ' +
            playerInstance.domRef.player.offsetWidth + 'px; height: ' +
            (playerInstance.domRef.player.offsetHeight) + 'px;'
        );

        divWrapper.appendChild(divClickThrough);

        //Bind the Onclick event
        const openClickthrough = function () {
            window.open(playerInstance.vastOptions.clickthroughUrl);

            //Tracking the Clickthorugh events
            if (typeof playerInstance.vastOptions.clicktracking !== 'undefined') {
                playerInstance.callUris(playerInstance.vastOptions.clicktracking);
            }
        };

        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + playerInstance.videoPlayerId);
        const isIos9orLower = (playerInstance.mobileInfo.device === 'iPhone') && (playerInstance.mobileInfo.userOsMajor !== false) && (playerInstance.mobileInfo.userOsMajor <= 9);

        clickthroughLayer.onclick = () => {
            if (playerInstance.domRef.player.paused) {
                //On Mobile Safari on iPhones with iOS 9 or lower open the clickthrough only once
                if (isIos9orLower && !playerInstance.suppressClickthrough) {
                    openClickthrough();
                    playerInstance.suppressClickthrough = true;

                } else {
                    playerInstance.domRef.player.play();
                }

            } else {
                openClickthrough();
                playerInstance.domRef.player.pause();
            }
        };
    };

    /**
     * Remove the Clickthrough layer
     */
    playerInstance.removeClickthrough = () => {
        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + playerInstance.videoPlayerId);

        if (clickthroughLayer) {
            clickthroughLayer.parentNode.removeChild(clickthroughLayer);
        }
    };
}
