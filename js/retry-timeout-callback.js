/*******************************************************************************
* Copyright (c) 2017 IBM Corporation and others.
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the Eclipse Public License v1.0
* which accompanies this distribution, and is available at
* http://www.eclipse.org/legal/epl-v10.html
*
* Contributors:
*     IBM Corporation - initial API and implementation
*******************************************************************************/
var retryTimeoutCallback = (function() {

    var bankServiceFileName = "BankService.java";
    var htmlRootDir = "/guides/draft-iguide-retry-timeout/html/";
    var __browserTransactionBaseURL = "https://global-ebank.openliberty.io/transactions";

    var listenToEditorForFeatureInServerXML = function(editor) {
        var saveServerXML = function(editor) {
            __saveServerXML(editor);
        };
        editor.addSaveListener(saveServerXML);
    };

    var addMicroProfileFaultToleranceFeatureButton = function(event) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            // Click or 'Enter' or 'Space' key event...
            __addMicroProfileFaultToleranceFeature();
        }
    };

    var __addMicroProfileFaultToleranceFeature = function() {
        var FTFeature = "      <feature>mpFaultTolerance-1.0</feature>";
        var stepName = stepContent.getCurrentStepName();
        var serverFileName = "server.xml";

        // reset content every time annotation is added through the button so as to clear out any
        // manual editing
        contentManager.resetTabbedEditorContents(stepName, serverFileName);
        var content = contentManager.getTabbedEditorContents(stepName, serverFileName);

        contentManager.insertTabbedEditorContents(stepName, serverFileName, 5, FTFeature);
        var readOnlyLines = [];
        // mark cdi feature line readonly
        readOnlyLines.push({
            from: 4,
            to: 4
        });
        contentManager.markTabbedEditorReadOnlyLines(stepName, serverFileName, readOnlyLines);
    };

    var __getMicroProfileFaultToleranceFeatureContent = function(content) {
        var editorContents = {};
        try {
            // match
            // <featureManager>
            //    <anything here>
            // </featureManager>
            // and capturing groups to get content before featureManager, the feature, and after
            // featureManager content.
            var featureManagerToMatch = "([\\s\\S]*)<featureManager>([\\s\\S]*)<\\/featureManager>([\\s\\S]*)";
            var regExpToMatch = new RegExp(featureManagerToMatch, "g");
            var groups = regExpToMatch.exec(content);
            editorContents.beforeFeature = groups[1];
            editorContents.features = groups[2];
            editorContents.afterFeature = groups[3];
        }
        catch (e) {
        }
        return editorContents;
    };

    var __getMicroProfileFaultToleranceFeatureContent = function(content) {
        var editorContents = {};
        try {
            // match
            // <featureManager>
            //    <anything here>
            // </featureManager>
            // and capturing groups to get content before featureManager, the feature, and after
            // featureManager content.
            var featureManagerToMatch = "([\\s\\S]*)<featureManager>([\\s\\S]*)<\\/featureManager>([\\s\\S]*)";
            var regExpToMatch = new RegExp(featureManagerToMatch, "g");
            var groups = regExpToMatch.exec(content);
            editorContents.beforeFeature = groups[1];
            editorContents.features = groups[2];
            editorContents.afterFeature = groups[3];
        }
        catch (e) {

        }
        return editorContents;
    };

    var __isFaultToleranceInFeatures = function(features) {
        var match = false;
        features = features.replace('\n', '');
        features = features.replace(/\s/g, ''); // Remove whitespace
        try {
            var featureMatches = features.match(/<feature>[\s\S]*?<\/feature>/g);
            $(featureMatches).each(function (index, feature) {
                if (feature.indexOf("<feature>mpFaultTolerance-1.0</feature>") !== -1) {
                    match = true;
                    return false; // break out of each loop
                }
            });
        }
        catch (e) {
        }
        return match;
    };

    var __isCDIInFeatures = function(features) {
        var match = false;
        features = features.replace('\n', '');
        features = features.replace(/\s/g, ''); // Remove whitespace
        try {
            var featureMatches = features.match(/<feature>[\s\S]*?<\/feature>/g);
            $(featureMatches).each(function (index, feature) {
                if (feature.indexOf("<feature>cdi-1.2</feature>") !== -1) {
                    match = true;
                    return false; // break out of each loop
                }
            });
        }
        catch (e) {
        }
        return match;
    };

    var __checkMicroProfileFaultToleranceFeatureContent = function(content) {
        var isFTFeatureThere = true;
        var editorContentBreakdown = __getMicroProfileFaultToleranceFeatureContent(content);
        if (editorContentBreakdown.hasOwnProperty("features")) {
            isFTFeatureThere =  __isFaultToleranceInFeatures(editorContentBreakdown.features) &&
                                __isCDIInFeatures(editorContentBreakdown.features);
            if (isFTFeatureThere) {
                // check for whether other stuffs are there
                var features = editorContentBreakdown.features;
                features = features.replace('\n', '');
                features = features.replace(/\s/g, '');
                if (features.length !== "<feature>mpFaultTolerance-1.0</feature><feature>cdi-1.2</feature>".length) {
                    isFTFeatureThere = false; // contains extra text
                }
            }
        } else {
            isFTFeatureThere = false;
        }
        return isFTFeatureThere;
    };

    var __correctEditorError = function(stepName) {
        // correct annotation/method
        if (stepName === "AddLibertyMPFaultTolerance") {
            __addMicroProfileFaultToleranceFeature();
        } else if (stepName === "TimeoutAnnotation") {
            __addTimeoutInEditor(stepName);
        } else if (stepName === "AddRetryOnRetry") {
            __addRetryOnRetryInEditor(stepName);
        }
    };

    var __saveServerXML = function(editor) {
        var stepName = stepContent.getCurrentStepName();
        var serverFileName = "server.xml";

        var content = contentManager.getTabbedEditorContents(stepName, serverFileName);
        if (__checkMicroProfileFaultToleranceFeatureContent(content)) {
            editor.closeEditorErrorBox(stepName);
            contentManager.markCurrentInstructionComplete(stepName);
        } else {
            // display error to fix it
            editor.createErrorLinkForCallBack(true, __correctEditorError);
        }
    };

    var saveServerXMLButton = function(event) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            // Click or 'Enter' or 'Space' key event...
            contentManager.saveTabbedEditor(stepContent.getCurrentStepName(), "server.xml");
        }
    };

    var __saveButtonEditor = function(stepName) {
        contentManager.saveTabbedEditor(stepName, bankServiceFileName);
    };

    var saveButtonEditor = function(event, stepName) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            // Click or 'Enter' or 'Space' key event...
            __saveButtonEditor(stepName);
        }
    };

    var listenToEditorForTimeoutAnnotation = function(editor) {
        editor.addSaveListener(__showStartingBrowser)
    };

    var listenToEditorForRetryAnnotation = function(editor) {
        editor.addSaveListener(__showStartingBrowser);
    };

    var __showStartingBrowser = function(editor) {
        var stepName = editor.getStepName();
        var content = contentManager.getTabbedEditorContents(stepName, bankServiceFileName);

        var htmlFile;
        if (stepName === "TimeoutAnnotation") {
            htmlFile = htmlRootDir + "transaction-history-timeout.html";
        } else if (stepName === "AddRetryOnRetry") {
            htmlFile = htmlRootDir + "transaction-history-retry-start.html";
        } 

        if (__checkEditorContent(stepName, content)) {
            editor.closeEditorErrorBox(stepName);
            var index = contentManager.getCurrentInstructionIndex();
            if (index === 0) {
                contentManager.markCurrentInstructionComplete(stepName);
                contentManager.updateWithNewInstructionNoMarkComplete(stepName);
                // display empty web browser
                contentManager.setPodContent(stepName, htmlFile);
                
                // resize the height of the tabbed editor
                contentManager.resizeTabbedEditor(stepName);               
            }
        } else {
            // display error and provide link to fix it
            editor.createErrorLinkForCallBack(true, __correctEditorError);
        }
    };
    
    var __checkEditorContent = function(stepName, content) {
        var contentIsCorrect = true;
        if (stepName === "TimeoutAnnotation") {
            contentIsCorrect = __validateEditorTimeoutAnnotationStep(content);
        } else if (stepName === "AddRetryOnRetry") {
            contentIsCorrect = __validateEditorRetryOnRetryStep(content);
        }

        return contentIsCorrect;
    };

    var __validateEditorTimeoutAnnotationStep = function(content) {
        var match = false;
        try {  
            var pattern = "public class BankService {\\s*" + // readonly boundary
            "@\\s*Timeout\\s*\\(\\s*2000\\s*\\)\\s*" +
            "public Service showTransactions()"; // readonly boundary
            var regExpToMatch = new RegExp(pattern, "g");
            content.match(regExpToMatch)[0];
            match = true;
        } catch (ex) {

        }
        return match;
    }

    var __validateEditorRetryOnRetryStep = function(content) {
        var match = false;
        try {
            var pattern = "public class BankService {\\s*" + // readonly boundary
            "@Retry\\s*\\(\\s*retryOn\\s*=\\s*TimeoutException\\.class\\s*\\)\\s*" +
            "@Timeout\\(2000\\)"; // readonly boundary
            var regExpToMatch = new RegExp(pattern, "g");
            content.match(regExpToMatch)[0];
            match = true;
        } catch(ex) {

        }
        return match;
    }

    var __addTimeoutInEditor = function(stepName) {
        contentManager.resetTabbedEditorContents(stepName, bankServiceFileName);
        var newContent = "    @Timeout(2000)";
        contentManager.replaceTabbedEditorContents(stepName, bankServiceFileName, 7, 7, newContent, 1);
    };

    var addTimeoutButton = function(event, stepName) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            __addTimeoutInEditor(stepName);
        }
    };

    var clickTransaction = function(event, stepName, numOfRequest) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            handleTransactionRequestInBrowser(stepName, numOfRequest);
        }
    };

    var handleTransactionRequestInBrowser = function(stepName, numOfRequest) {       
        var browserUrl = __browserTransactionBaseURL;
        var browser = contentManager.getBrowser(stepName);
        var browserContentHTML = htmlRootDir + "global-eBank.html";      
         
        contentManager.markCurrentInstructionComplete(stepName);
        if (stepName === "TransactionHistory") {
            if (numOfRequest === 1) {
                browserContentHTML = htmlRootDir + "transaction-history.html";
                contentManager.updateWithNewInstructionNoMarkComplete(stepName);
            } else if (numOfRequest === 2) {
                browserContentHTML = htmlRootDir + "transaction-history-loading.html";
            }            
        } else if (stepName === "AddRetryOnRetry") {
            browserContentHTML = htmlRootDir + "transaction-history-retry-onRetry.html";
        }

        contentManager.setBrowserURL(stepName, browserUrl, 0);
        browser.setBrowserContent(browserContentHTML);
    };

    var __populateURL = function(event, stepName) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
               // Click or 'Enter' or 'Space' key event...
            contentManager.setBrowserURL(stepName, __browserTransactionBaseURL);
        }
    };

    var __listenToBrowserForTransactionHistory = function(webBrowser) {
        var setBrowserContent = function(currentURL) {
            var stepName = webBrowser.getStepName();
            var currentInstructionIndex = contentManager.getCurrentInstructionIndex(stepName);
            if (currentInstructionIndex === 0) {
                if (webBrowser.getURL() === __browserTransactionBaseURL) {
                    webBrowser.setBrowserContent(htmlRootDir + "transaction-history.html");
                    contentManager.markCurrentInstructionComplete(stepName);
                    contentManager.updateWithNewInstructionNoMarkComplete(stepName);
                }               
            } else if (currentInstructionIndex === 1) {
                // Check if the url is correct before loading content
                if (webBrowser.getURL() === __browserTransactionBaseURL) {
                    webBrowser.setBrowserContent(htmlRootDir + "transaction-history-loading.html");
                    contentManager.markCurrentInstructionComplete(stepName);
                }                
            }
        }
        webBrowser.addUpdatedURLListener(setBrowserContent);
    };

    var __listenToBrowserForTransactionHistoryAfterRetry = function(webBrowser) {
        var setBrowserContent = function(currentURL) {
            var stepName = webBrowser.getStepName();
            if (contentManager.getCurrentInstructionIndex(stepName) === 1) {
                // Check if the url is correct before loading content
                if (webBrowser.getURL() === __browserTransactionBaseURL) {
                    webBrowser.setBrowserContent(htmlRootDir + "transaction-history-retry-onRetry.html");
                    contentManager.markCurrentInstructionComplete(stepName);
                }                
            }
        }
        webBrowser.addUpdatedURLListener(setBrowserContent);
    };

    var addRetryOnRetryButton = function(event, stepName) {
        if (event.type === "click" ||
           (event.type === "keypress" && (event.which === 13 || event.which === 32))) {
            __addRetryOnRetryInEditor(stepName);
        }
    };

    var __addRetryOnRetryInEditor = function(stepName) {
        contentManager.resetTabbedEditorContents(stepName, bankServiceFileName);
        var newContent = "    @Retry(retryOn = TimeoutException.class)";
        contentManager.replaceTabbedEditorContents(stepName, bankServiceFileName, 12, 12, newContent, 1);
    };

    return {
        listenToEditorForFeatureInServerXML: listenToEditorForFeatureInServerXML,
        addMicroProfileFaultToleranceFeatureButton: addMicroProfileFaultToleranceFeatureButton,
        addMicroProfileFaultToleranceFeature: __addMicroProfileFaultToleranceFeature,
        saveServerXML: __saveServerXML,
        saveServerXMLButton: saveServerXMLButton,
        saveButtonEditor: saveButtonEditor,
        addTimeoutButton: addTimeoutButton,
        clickTransaction: clickTransaction,
        listenToEditorForTimeoutAnnotation: listenToEditorForTimeoutAnnotation,
        listenToBrowserForTransactionHistory: __listenToBrowserForTransactionHistory,
        listenToEditorForRetryAnnotation: listenToEditorForRetryAnnotation,
        listenToBrowserForTransactionHistoryAfterRetry: __listenToBrowserForTransactionHistoryAfterRetry,
        populateURL: __populateURL,
        addRetryOnRetryButton: addRetryOnRetryButton
    }
})();
