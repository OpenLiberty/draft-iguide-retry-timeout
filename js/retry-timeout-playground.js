var retryTimeoutPlayground = function() {
    var htmlRootDir = '/guides/iguide-retry-timeout/html/';
    var __browserTransactionBaseURL = 'https://global-ebank.openliberty.io/transactions';

    var _playground = function(root, stepName, params) {
        this.fileName = 'BankService.java';
        this.root = root;
        this.stepName = stepName;
        this.browser = contentManager.getBrowser(stepName);
        this.editor = contentManager.getEditorInstanceFromTabbedEditor(stepName, this.fileName);
    };

    _playground.prototype = {
        setParams: function(params) {
            var retryParams = params.retryParms;

            // Set params, or use default param values
            this.maxRetries = parseInt(retryParams.maxRetries);
            this.maxDuration = parseInt(retryParams.maxDuration);
            this.setMaxDurationOnTimeline(this.maxDuration);
            this.delay = parseInt(retryParams.delay);
            this.jitter = parseInt(retryParams.jitter);

            this.timeout = parseInt(params.timeoutParms.value);

            // If unlimited max duration, calculate theoretical using other params
            if (this.maxDuration === Number.MAX_SAFE_INTEGER && this.maxRetries !== -1) {
                this.maxDuration = this.calcMaxDuration();
            }

            // maxRetries+1 is for timeoutsToSimulate. workaround to simulate the last timeout
            this.timeoutsToSimulate = this.maxRetries + 1;
        },
        startTimeline: function() {
            this.resetPlayground();
            this.ranOnce = true;

            var $tickContainers = $('[data-step=\'' + this.stepName + '\']').find('.tickContainer');
            this.timeoutTickContainer = $tickContainers[0];
            this.retryTickContainer = $tickContainers[1];
            this.progressBar = $('[data-step=\'' + this.stepName + '\']').find('.progressBar').find('div');

            if (!this.browser) {
                this.browser = contentManager.getBrowser(this.stepName);
            }
            this.browser.setBrowserContent(htmlRootDir + 'transaction-history-loading.html');
            this.setProgressBar();
        },

        updatePlayground: function() {
            this.resetPlayground();

            //TODO: this validation should be for playground step only
            // probably use existing validation for other steps.. somehow
            var params, paramsValid;
            try {
                params = this.getParamsFromEditor();
                // Retry guide steps use seconds for maxDuration, so convert to ms
                if (this.stepName !== 'Playground') {
                    //TODO: use existing Retry step validation for strictness
                    var content = this.editor.getEditorContent();
                    var paramsToCheck = this.getParamsToCheck();
                    if (this.__checkRetryAnnotationInContent(content, paramsToCheck)) {
                        this.editor.closeEditorErrorBox(this.stepName);
                        var index = contentManager.getCurrentInstructionIndex();
                        if (index === 0) {
                            contentManager.markCurrentInstructionComplete(stepName);
                            contentManager.updateWithNewInstructionNoMarkComplete(stepName);
                        } else {
                            // display error and provide link to fix it
                            this.editor.createErrorLinkForCallBack(true, __correctEditorError);
                        }
                    }
                    params.retryParms.maxDuration = params.retryParms.maxDuration*1000;
                    params = this.verifyAndCorrectParams(params);
                }

                this.setParams(params);

                //Below should be playground-only code
                if (this.stepName === 'Playground') {
                    paramsValid = this.verifyAndCorrectParams(params);
                    if (paramsValid) {
                        this.startTimeline(params);
                    } else {
                        this.editor.createCustomErrorMessage(retryTimeoutMessages.INVALID_PARAMETER_VALUE);
                    }
                }
            } catch(e) {
                this.editor.createCustomErrorMessage(e);
            }
            //     var content = this.editor.getEditorContent();
            //     var paramsToCheck = [];

            //     if (this.__checkRetryAnnotationInContent(content, paramsToCheck)) {
            //         this.editor.closeEditorErrorBox(stepName);
            //         var index = contentManager.getCurrentInstructionIndex();
            //         if (index === 0) {
            //             contentManager.markCurrentInstructionComplete(stepName);
            //             contentManager.updateWithNewInstructionNoMarkComplete(stepName);
            
            //             // Display the pod with dashboard and web browser in it
            //             var htmlFile = htmlRootDir + "transaction-history-retry-dashboard.html";
            //             contentManager.setPodContent(stepName, htmlFile);
            //             contentManager.resizeTabbedEditor(this.stepName);
            //             // var htmlFile = htmlRootDir + "playground-dashboard.html";
            //             // contentManager.setPodContent(stepName, htmlFile);
            //         }
            //     } else {
            //         // display error and provide link to fix it
            //         this.editor.createErrorLinkForCallBack(true, __correctEditorError);
            //     }            
        },

        replayPlayground: function() {
            this.resetPlayground();
            if (this.ranOnce) {
                this.browser.setBrowserContent(htmlRootDir + 'transaction-history-loading.html');
                this.setProgressBar();
            }
        },

        resetPlayground: function() {
            if (!this.browser) {
                this.browser = contentManager.getBrowser(this.stepName);
            }
            this.browser.setBrowserContent(null);

            if (!this.editor) {
                this.editor = contentManager.getEditorInstanceFromTabbedEditor(this.stepName, this.fileName);
            }
            this.editor.closeEditorErrorBox();

            clearInterval(this.moveProgressBar);
            if (this.progressBar) {
                this.resetProgressBar();
            }

            this.timeoutCount = 0;
            this.elapsedRetryProgress = 0;
            this.currentPctProgress = 0;

            $(this.timeoutTickContainer).empty();
            $(this.retryTickContainer).empty();
        },
        
        resetProgressBar: function() {
            this.progressBar.attr('style', 'width: 0%;');
        },

        calcMaxDuration: function() {
            return (this.timeoutsToSimulate) * (this.timeout + this.delay + this.jitter);
        },

        setMaxDurationOnTimeline: function(maxDurationValueInMS) {
            var maxDurationSeconds;
            if (maxDurationValueInMS === Number.MAX_SAFE_INTEGER) {
                maxDurationSeconds = '&infin; ';
            } else {
                // Convert the inputted MS value to Seconds
                maxDurationSeconds = Math.round((maxDurationValueInMS/1000) * 10)/10;
                if (maxDurationSeconds === 0) {
                    // If the converted value is less than .1s, convert to the 
                    // smallest amount of time greater than 0 seconds.
                    var convertedToSeconds = maxDurationValueInMS/1000;
                    var decimalPoints = 100;
                    while (maxDurationSeconds === 0) {
                        maxDurationSeconds = Math.round(convertedToSeconds * decimalPoints)/decimalPoints;
                        decimalPoints = decimalPoints * 10;
                    }
                }
            }
            
            // Add to the timeline in the playground.
            $maxDuration = $('[data-step=\'' + this.stepName + '\']').find('.timelineLegendEnd');
            $maxDuration.html(maxDurationSeconds + 's');
        },

        /**
         * Sets the timeout and retry ticks in the dashboard. Invoked from setProgress()
         * when a timeout should occur.  Re-invokes setProgress for the next "iteration".
         * 
         */
        setTicks: function() {
            this.timeoutCount++;


            //TODO: for non-playground, set transaction page before last timeout
            if ((this.stepName !== 'Playground') && (this.timeoutCount === this.timeoutsToSimulate)) {
                this.stopProgressBar();
                this.browser.setURL(__browserTransactionBaseURL);
                this.browser.setBrowserContent(htmlRootDir + 'transaction-history.html');
                return;
            }

            // Show the timeout tick
            // Do the math...
            var timeoutTickPctPlacement = Math.round((this.elapsedRetryProgress/this.maxDuration) * 1000) / 10;  // Round to 1 decimal place
            if (this.currentPctProgress < timeoutTickPctPlacement) {
                if (timeoutTickPctPlacement <= 100) {
                    this.progressBar.attr('style', 'width:' + timeoutTickPctPlacement + '%;');
                    //console.log("set: " + timeoutTickPctPlacement + " -1");            
                    this.currentPctProgress = timeoutTickPctPlacement;           
                } else {
                    this.progressBar.attr('style', 'width: 100%');
                    //console.log("set: 100 - 2");               browser.setURL(__browserTransactionBaseURL);
                    // NOTE THAT THAT THIS HTML HAS A DELAY IN IT.  MAY NEED NEW ONE FOR PLAYGROUND.
                    this.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                    return;
                }
            }

            // Determine label for the timeout tick...convert from ms to seconds and round to 1 decimal place
            //console.log("Timeout: " + timeoutCount + " timeoutTickPctPlacement: " + timeoutTickPctPlacement);
            var timeoutLabel = (this.elapsedRetryProgress/1000).toFixed(2) + 's';
            var timeoutTickAdjustment = timeoutTickPctPlacement <= 1 ? '%);': '% - 3px);';
            $('<div/>').attr('class','timelineTick timeoutTick').attr('style','left:calc(' + timeoutTickPctPlacement + timeoutTickAdjustment).attr('title', timeoutLabel).appendTo(this.timeoutTickContainer);
            if (this.stepName !== 'Playground') {
                $('<div/>', {'class': 'timelineLabel timeoutLabel', text: timeoutLabel, style: 'left:calc(' + timeoutTickPctPlacement + '% - 29px);'}).appendTo(this.timeoutTickContainer);
            }

            if ((this.stepName === 'Playground') && (this.timeoutCount === this.timeoutsToSimulate)) {
                this.stopProgressBar();
                this.browser.setURL(__browserTransactionBaseURL);
                this.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                return;
            }

            // Show the retry tick
            var retryTickSpot = this.elapsedRetryProgress + this.delay;
            //console.log("retryTickSpot: " + retryTickSpot);
            if (this.jitter > 0 && this.delay > 0) {
                // Have a jitter that determines the next delay time.
                var positiveOrNegative = Math.floor(Math.random() * 10) < 5 ? -1: 1;
                var jitterDelay = Math.floor((Math.random() * this.jitter) + 1) * positiveOrNegative;
                //console.log("jitterDelay: " + jitterDelay);
                retryTickSpot += jitterDelay;
                //console.log("retryTickSpot adjusted for jitter: " + retryTickSpot);
            }
            var retryTickPctPlacement = Math.round((retryTickSpot/this.maxDuration) * 1000) / 10;  // Round to 1 decimal place
            var progress1pct = this.maxDuration * .01;  // Number Milliseconds in 1% of timeline.
            var me = this;
            this.moveProgressBar = setInterval( function() {
                // Advance the blue progress bar 1% at a time until we reach the spot
                // for the retry tick.
                me.currentPctProgress++;
                if (retryTickPctPlacement < 100  &&  (me.currentPctProgress+1) < retryTickPctPlacement) { 
                    me.currentPctProgress++;               
                    if (me.currentPctProgress <= 100) {
                        me.progressBar.attr('style', 'width:' + me.currentPctProgress + '%;');
                        //console.log("set: " + currentPctProgress + " -3"); 
                    } else {
                        // Exceeded maxDuration!
                        clearInterval(me.moveProgressBar);
                        me.progressBar.attr('style', 'width: 100%;');
                        //console.log("set: 100% -4"); 
                        //console.log("maxDuration exceeded....put up error");
                        this.browser.setURL(__browserTransactionBaseURL);
                        // NOTE THAT THAT THIS HTML HAS A DELAY IN IT.  MAY NEED NEW ONE FOR PLAYGROUND.
                        this.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                    }
                } else {
                    clearInterval(me.moveProgressBar);
                    if (retryTickPctPlacement <= 100) {
                        me.currentPctProgress = retryTickPctPlacement;
        
                        // Move the blue progress bar exactly to the retry tick spot
                        me.progressBar.attr('style', 'width:' + retryTickPctPlacement + '%;');
                        //console.log("set: " + retryTickPctPlacement + " -5"); 
                        me.elapsedRetryProgress = retryTickSpot;
        
                        // Put up the retry tick at its spot...
                        // Determine label for the retry tick...convert from ms to seconds and round to 1 decimal place
                        var retryLabel = (me.elapsedRetryProgress/1000).toFixed(2) + 's';
                        //console.log("retry tick placed.  CurrentPctProgress: " + currentPctProgress);
                        var retryTickAdjustment = retryTickPctPlacement <= 1 ? '%);': '% - 3px);';
                        $('<div/>').attr('class','timelineTick retryTick').attr('style','left:calc(' + retryTickPctPlacement + retryTickAdjustment).attr('title', retryLabel).appendTo(me.retryTickContainer);
                        if (me.stepName !== 'Playground') {
                            $('<div/>', {'class': 'timelineLabel retryLabel', text: retryLabel, style: 'left:calc(' + retryTickPctPlacement + '% - 29px);'}).appendTo(me.retryTickContainer);
                        }
                
                        // Advance the progress bar until the next timeout
                        me.setProgressBar();    
                    } else {
                        // Hit max duration time limit before initiating a Retry.  Error out.
                        me.progressBar.attr('style', 'width: 100%;');
                        //console.log("set: 100% -6"); 
                        //console.log("maxDuration exceeded....put up error");                    browser.setURL(__browserTransactionBaseURL);
                        // NOTE THAT THAT THIS HTML HAS A DELAY IN IT.  MAY NEED NEW ONE FOR PLAYGROUND.
                        me.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                    }
                }
            }, progress1pct);
        },

        /**
         * Sets the progress in the progress bar timeline, then calls setTicks() to put
         * up the timeout and retry ticks.
         * 
         */
        setProgressBar: function() {
            var progress1pct = this.maxDuration * .01;  // Number Milliseconds in 1% of timeline.
            var me = this;
            this.moveProgressBar = setInterval( function() {
                // Moves the timeline forward 1% at a time.  If no more timeouts should
                // be processed it stops and shows the transaction history.
                if (me.timeoutCount === me.timeoutsToSimulate) {
                    //TODO: this should finish one more timeout and show failure page
                    clearInterval(me.moveProgressBar);
                    me.currentPctProgress += 1; // Advance the progress bar to simulate processing
                    if (me.currentPctProgress <= 100) {
                        me.progressBar.attr('style', 'width:' + me.currentPctProgress + '%;');
                        //console.log("set: " + currentPctProgress + " -7"); 
                    } else {
                        me.progressBar.attr('style', 'width:100%;');
                        //console.log("set: 100% -8"); 
                    }
                    me.browser.setURL(__browserTransactionBaseURL);
                    me.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                } else {
                    // Determine how far (% of timeline) we would travel in <timeout> milliseconds.
                    var forwardPctProgress = Math.round(((me.elapsedRetryProgress + me.timeout)/me.maxDuration) * 1000) / 10;  // Round to 1 decimal place
                    if ((me.currentPctProgress + 1) < forwardPctProgress) {
                        me.currentPctProgress++;
                        if (me.currentPctProgress < 100) {
                            me.progressBar.attr('style', 'width:' + me.currentPctProgress + '%;');
                            //console.log("set: " + currentPctProgress + " -9"); 
                        } else {
                            // Exceeded maxDuration!
                            // console.log("maxDuration exceeded....put up message");
                            clearInterval(me.moveProgressBar);
                            me.progressBar.attr('style', 'width: 100%;');
                            //console.log("set: " + 100 + " -10");                        
                            me.browser.setURL(__browserTransactionBaseURL);
                            // NOTE THAT THAT THIS HTML HAS A DELAY IN IT.  MAY NEED NEW ONE FOR PLAYGROUND.
                            me.browser.setBrowserContent(htmlRootDir + 'playground-timeout-error.html');
                        }
                    }  else {
                        clearInterval(me.moveProgressBar);
                        me.elapsedRetryProgress += me.timeout;
                        // console.log("set elapsedRetryProgress up " + timeout + ":" + elapsedRetryProgress);
                        me.setTicks();
                    }
                }
            }, progress1pct);  // Repeat -- moving the timeline 1% at a time
        },

        stopProgressBar: function() {
            clearInterval(this.moveProgressBar);
            this.currentPctProgress += 1; // Advance the progress bar to simulate processing
            if (this.currentPctProgress <= 100) {
                this.progressBar.attr('style', 'width:' + this.currentPctProgress + '%;');
            } else {
                this.progressBar.attr('style', 'width:100%;');
            }
        },

        getParamsFromEditor: function() {
            var editorContents = {};
            editorContents.retryParms = {};
            
            editorContents.retryParms = this.__getRetryParams();
            editorContents.timeoutParms = this.__getTimeoutParams();

            return editorContents;
        },

        __getRetryParams: function() {
            var content = this.editor.getEditorContent();
            var retryParms = {};
            // [0] - original content
            // [1] - Retry annotation
            // [2] - retry parameters as a string
            var retryRegexString = '@Retry\\s*' + '(\\(' +
            '((?:\\s*(?:\\w*)\\s*=\\s*[-\\d\.,a-zA-Z]*)*)*' +
            '\\s*\\))?';
            var retryRegex = new RegExp(retryRegexString, 'g');
            var retryMatch = retryRegex.exec(content);

            if (!retryMatch) {
                throw retryTimeoutMessages.RETRY_REQUIRED;
            } else if (!retryMatch[2]) {
                // This just means the input didn't match the expected format.
                // Any non-empty code inside the parentheses should be invalid.
                var retryParamRegex = /@Retry\s*((?:\((.*\s*)\)?)|[\s\S]*\))?/g;
                var paramMatch = retryParamRegex.exec(content);
                // ensure empty parentheses match if they exist. else input is invalid
                if (paramMatch && paramMatch[1] && paramMatch[1].replace(/\s*/g, '') !== '()') {
                    throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
                }
                return retryParms;
            }
            // Turn string of params into array
            var retryParamsString = retryMatch[2];
            retryParams = this.__parmsToArray(retryParamsString);

            var keyValueRegex = /(.*)=(.*)/;
            var match = null;
            $.each(retryParams, function(i, param) {
                match = keyValueRegex.exec(param);
                if (!match) { // invalid param format for @Retry
                    throw retryTimeoutMessages.SYNTAX_ERROR; 
                }
                switch (match[1]) {
                case 'retryOn':
                case 'abortOn':
                    if (this.stepName === 'Playground') {
                        throw retryTimeoutMessages.RETRY_ABORT_UNSUPPORTED;
                    }
                    break;
                case 'maxRetries':
                case 'maxDuration':
                case 'delay':
                case 'jitter':
                    if (!match[2]) {
                        throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
                    }
                    retryParms[match[1]] = match[2];
                    break;
                case 'durationUnit':
                case 'delayUnit':
                case 'jitterDelayUnit':
                    if (this.stepName === 'Playground') {
                        throw retryTimeoutMessages.UNIT_PARAMS_DISABLED;
                    }
                    break;
                default:
                    throw retryTimeoutMessages.UNSUPPORTED_RETRY_PARAM;
                }
            });
            return retryParms;
        },

        __getTimeoutParams: function() {
            var content = this.editor.getEditorContent();
            var timeoutParms = {};

            // [0] - original content
            // [1] - Timeout annotation
            // [2] - 'value=xyz' parameter if it exists
            // [3] - 'xyz' in `value=xyz' from above
            // [4] - standalone integer value parameter if it exists
            var timeoutRegexString = '\\s*(@Timeout)\\s*' + '(?:\\(' + 
            '((?:\\s*\\w+\\s*=\\s*([-\\w,.]*)\\s*)*)' + '\\)|(?:\\(\\s*([\\w]*)\\s*\\)))?'; // "(?:(?:unit|value)\\s*=\\s*[\\d\\.,a-zA-Z]+\\s*)*|"
            var timeoutRegex = new RegExp(timeoutRegexString, 'g');
            var timeoutMatch = timeoutRegex.exec(content);

            if (!timeoutMatch) {
                throw retryTimeoutMessages.TIMEOUT_REQUIRED;
            }
            if (timeoutMatch[3] == '') {
                throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
            }

            if (timeoutMatch[2]) { // valid parameter format
                var timeoutMatchString = timeoutMatch[2];
                var timeoutParams = this.__parmsToArray(timeoutMatch[2]);

                var keyValueRegex = /(.*)=(.*)/;
                var match = null;
                $.each(timeoutParams, function(i, param) {
                    match = keyValueRegex.exec(param);
                    if (!match) { // invalid param format for @Retry
                        throw retryTimeoutMessages.SYNTAX_ERROR; 
                    }
                    switch (match[1]) {
                    case 'value':
                        if (!match[2]) {
                            throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
                        }
                        timeoutParms[match[1]] = match[2];
                        break;
                    case 'unit':
                        throw retryTimeoutMessages.UNIT_PARAMS_DISABLED;
                    default:
                        throw retryTimeoutMessages.UNSUPPORTED_TIMEOUT_PARAM;
                    }
                });
            } else if (timeoutMatch[4]) { // else, standalone value (to be validated later)
                timeoutParms.value = timeoutMatch[4];
            } else { // else empty or some wrong format
                var timeoutParamRegex = /@Timeout\s*((?:\((.*\s*)\)?)|[\s\S]*\))?/g;
                var paramMatch = timeoutParamRegex.exec(content);
                // ensure empty parentheses match if they exist. else input is invalid
                if (paramMatch && paramMatch[1] && paramMatch[1].replace(/\s*/g, '') !== '()') {
                    throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
                }
            }
            return timeoutParms;
        },
        
        // Checks if parameters are valid (all in milliseconds)
        // returns false if something is invalid
        // returns corrected parameters otherwise
        verifyAndCorrectParams: function(params) {
            var retryParms = params.retryParms;
            if (retryParms) {
                var maxRetries = this.__getValueIfInteger(retryParms.maxRetries);
                var maxDuration = this.__getValueIfInteger(retryParms.maxDuration);
                var delay = this.__getValueIfInteger(retryParms.delay);
                var jitter = this.__getValueIfInteger(retryParms.jitter);
        
                // If any variable is invalid, return false
                if (maxRetries === false ||
                    maxDuration === false ||
                    delay === false ||
                    jitter === false) {
                    return false;
                }

                if (maxRetries === -1 && maxDuration === 0) {
                    throw retryTimeoutMessages.UNLIMITED_RETRIES;
                }

                if (maxRetries) {
                    if (maxRetries < -1) {
                        return false;
                    }
                } else if (maxRetries === null) {
                    maxRetries = 3;
                    params.retryParms.maxRetries = 3;
                }

                if (maxDuration !== null) { // 0 case matters and would get skipped in `if (maxDuration)`
                    if (maxDuration < 0) {
                        return false;
                    } else if (maxDuration === 0) {
                        maxDuration = Number.MAX_SAFE_INTEGER;
                        params.retryParms.maxDuration = Number.MAX_SAFE_INTEGER;
                    }
                } else {
                    maxDuration = 180000;
                    params.retryParms.maxDuration = 180000;
                }

                if (delay) {
                    if (delay < 0) {
                        return false;
                    }
                    if (delay > maxDuration) {
                        throw retryTimeoutMessages.DURATION_LESS_THAN_DELAY;
                    }
                } else if (delay === null) {
                    delay = 0;
                    params.retryParms.delay = 0;
                }

                if (jitter) {
                    if (jitter < 0) {
                        return false;
                    }
                } else if (jitter === null) {
                    jitter = 200;
                    params.retryParms.jitter = 200;
                }

                // jitter clamp
                if (jitter > delay) {
                    params.retryParms.jitter = params.retryParms.delay;
                }
            }

            var timeoutParms = params.timeoutParms;
            if (timeoutParms) {
                var value = this.__getValueIfInteger(timeoutParms.value);
                if (value) {
                    if (value < 0) {
                        return false;
                    }
                } else if (value === null) {
                    value = 1000;
                    params.timeoutParms.value = 1000;
                } else {
                    return false;
                }
            }
            return params;
        },

        // returns the Integer value if the parameter string is an integer
        // returns null if nothing passed in
        // returns false if invalid input is passed in
        __getValueIfInteger: function(paramValueString) {
            if (paramValueString) {
                var regex =/^[-]?\d+$/gm; // regex for matching integer format
                var match = regex.exec(paramValueString);
                if (match) {
                    var param = match[0];
                    return parseInt(param);
                } else {
                    return false;
                }
            } else {
                return null;
            }
        },
        
        // converts the string of parameters into an array
        __parmsToArray: function(parms) {
            if (!parms) {
                throw retryTimeoutMessages.INVALID_PARAMETER_VALUE;
            }
            parms = parms.replace(/\s/g, '');  // Remove white space
            if (parms.trim() !== '') {
                parms = parms.split(',');
            } else {
                parms = [];
            }
            return parms;
        },

        getParamsToCheck: function() {
            var paramsToCheck = [];
            if (stepName === "AddLimitsRetry") {
                paramsToCheck = ["retryOn=TimeoutException.class",
                                "maxRetries=4",
                                "maxDuration=10",
                                "durationUnit=ChronoUnit.SECONDS"
                                ];
            } else if (stepName === "AddDelayRetry") {
                paramsToCheck = ["retryOn=TimeoutException.class",
                                "maxRetries=4",
                                "maxDuration=10",
                                "durationUnit=ChronoUnit.SECONDS",
                                "delay=200",
                                "delayUnit=ChronoUnit.MILLIS"
                                ];
            } else if (stepName === "AddJitterRetry") {
                paramsToCheck = ["retryOn=TimeoutException.class",
                                "maxRetries=4",
                                "maxDuration=10",
                                "durationUnit=ChronoUnit.SECONDS",
                                "delay=200",
                                "delayUnit=ChronoUnit.MILLIS",
                                "jitter=100",
                                "jitterDelayUnit=ChronoUnit.MILLIS"
                                ];
            }
            return paramsToCheck;
        },
        __checkRetryAnnotationInContent: function(content, parmsToCheck) {
            var annotationIsCorrect = true;
            var editorContentParts = this.__getEditorParts(content);
            if (editorContentParts.hasOwnProperty('retryParms')) {
                var parmsInAnnotation = this.__isParmInRetryAnnotation(editorContentParts.retryParms, parmsToCheck);
                if (parmsInAnnotation !== 1) {
                    annotationIsCorrect = false;
                }
            } else {
                annotationIsCorrect = false;  // None specified
            }
            return annotationIsCorrect;
        },

        __getEditorParts: function(content) {
            var editorContents = {};
            try {
                // match:
                //
                // public class BankService {
                //  < space or newline >
                //     @Retry(...)
                //     @Timeout(2000)
                //     public Service showTransactions()....
                //
                // and capture groups to get content before the annotation,
                // the @Retry annotation, the @Retry annotation params, and
                // content after the annotation.
                //
                // Syntax:
                //  \s to match all whitespace characters
                //  \S to match non whitespace characters
                //  \d to match digits
                //  () capturing group
                //  (?:) noncapturing group
                //
                // Result:
                //   groups[0] - same as content
                //   groups[1] - content before the @Retry annotation
                //   groups[2] - the whole @Retry annotation
                //   groups[3] - the @Retry parameters
                //   groups[4] - content after the @Retry annotation
                var codeToMatch = '([\\s\\S]*public class BankService {\\s*)' +     // Before the @Retry
                                  '(@Retry' + '\\s*' + '\\(' + '\\s*' +
                                  '((?:\\s*(?:retryOn|maxRetries|maxDuration|durationUnit|delay|delayUnit|jitter|jitterDelayUnit|abortOn)\\s*=\\s*[\\d\.,a-zA-Z]*)*)' +
                                  '\\s*' + '\\))' +
                                  '(\\s*@Timeout\\(2000\\)[\\s\\S]*)';              // After the @Retry
                var regExpToMatch = new RegExp(codeToMatch, 'g');
                var groups = regExpToMatch.exec(content);
    
                var parms = groups[3];   // String of just the @Retry paramters
                parms = parms.replace('\n','');
                parms = parms.replace(/\s/g, '');  // Remove white space
                if (parms.trim() !== '') {
                    parms = parms.split(',');
                } else {
                    parms = [];
                }
    
                editorContents.retryParms = parms;
                editorContents.afterAnnotationContent = groups[4];
    
            } catch (e) {
    
            }
            return editorContents;
        },
        __isParmInRetryAnnotation: function(annotationParms, parmsToCheck) {
            var parms = [];     // Array of parm objects { parm, value }
            var allMatch = 1;   // Assume all match
    
            // For each parameter, pull apart parameter name and its value
            $(annotationParms).each(function(index, element) {
                if (element.indexOf('=') !== -1) {
                    parms[index] = {};
                    parms[index].name = element.trim().substring(0, element.indexOf('='));
                    parms[index].value = element.trim().substring(element.indexOf('=') + 1);
                }
            });
    
            // Now check that each expected parm (parmsToCheck array) and its
            // value exists in inputted parms.
            $(parmsToCheck).each(function(index, element) {
                var elementMatch = false;
                if (element.indexOf('=') !== -1) {
                    // For each expected parameter, pull apart parameter name and its value
                    var expectedParm = element.trim().substring(0, element.indexOf('='));
                    var expectedValue = element.trim().substring(element.indexOf('=') + 1);
    
                    // Loop through inputted parms to see if expected parm exists
                    $(parms).each(function(parmsIndex, parmsElement) {
                        if (parmsElement.name === expectedParm &&
                            parmsElement.value === expectedValue) {
                            elementMatch = true;
                            return false;   // break out of loop
                        }
                    });
                }
    
                if (elementMatch === false) {
                    allMatch = 0;
                    return false;   // break out of loop
                }
            });

            if (allMatch === 1 && annotationParms.length > parmsToCheck.length) {
                allMatch = 2; // extra Parameters
            }
    
            return allMatch;
        }
    };

    var create = function(root, stepName, params) {
        return new _playground(root, stepName, params);
    };

    return {
        create: create
    };

}();