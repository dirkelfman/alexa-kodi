/**
 * App ID for the skill
 */
var APP_ID = null; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

//ARN - arn:aws:lambda:us-east-1:663361677957:function:Kodi_Skill


var SimpleXBMC = require('./simple-xbmc');
var when = require('when');
/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var appConfig = null;
try {
    appConfig = require('./config');
}
catch (e) {
    throw new Error('needs ./config.json in the format of { "host": "hostName", "port": tpcPort }');
}


var KeyConstants = {
    ContinueAction : 'ContinueAction',
    TvName : 'TvName',
    Episode : 'Episode',
    Movie : 'Movie',
    Season : 'Season',
    ChoiceType : 'ChoiceType',
    ShowChoice: 'ShowChoice',
    MovieChoice : "MovieChoice",
    ContinueIntent:"ContinueIntent"
};

var KodiContext = function(intent, session, response){
    this._response = response;
    this._intent = intent;
    this._session = session;
    this._client = null;
};

KodiContext.prototype.setResponseMessage = function (responseType, params) {
    this.bufferFn = function () {
        this.closeClient();
        this._response[responseType].apply(this._response, params);
    };
    if (!this.buffer) {
        this.bufferFn();
    }
};

KodiContext.prototype.tell = function (){
    this.setResponseMessage('tell', arguments);
};

KodiContext.prototype.tellWithCard = function () {
    this.setResponseMessage('tellWithCard', arguments);
};

KodiContext.prototype.ask = function () {
    this.setResponseMessage('ask', arguments);
};

KodiContext.prototype.askWithCard = function () {
    this.setResponseMessage('askWithCard', arguments);
};

KodiContext.prototype.closeClient = function() {
    if (this._client) {
        this._client.close();
    }
};




KodiContext.prototype.flush = function () {
    if (this.bufferFn) {
        this.bufferFn();
    }
    this.bufferFn = null;
};

KodiContext.prototype.getClient = function () {
    if (!this._client) {
        this._client = new SimpleXBMC(appConfig.host, appConfig.port);
    }
    return this._client;
};

KodiContext.prototype.setField = function (key,value) {
    this._session.attributes[key] = value;
};

KodiContext.prototype.getField = function (key, defaultValue){
    var ret = this._intent.slots[key] && this._intent.slots[key].value;
    if (ret !== undefined && ret !== null ) {
        this._session.attributes[key] = ret;
    } else {
        ret = this._session.attributes[key];
    }
    return ret;
};




/**
     * KodiSkiLl is a child of AlexaSkill.
     * To read more about inheritance in JavaScript, see the link below.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
     */
var KodiSkiLl = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
KodiSkiLl.prototype = Object.create(AlexaSkill.prototype);
KodiSkiLl.prototype.constructor = KodiSkiLl;

/**
 * Overriden to show that a subclass can override this function to initialize session state.
 */
KodiSkiLl.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);

    // Any session init logic would go here.
};

/**
 * If the user launches without specifying an intent, route to the correct function.
 */
KodiSkiLl.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("KodiSkiLl onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    
    var speechOutput = " you can ask to play  or pause or search.  you stupid idot.";
    
    
    response.ask(speechOutput);
};

/**
 * Overriden to show that a subclass can override this function to teardown session state.
 */
KodiSkiLl.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);

    //Any session cleanup logic would go here.
};


KodiSkiLl.prototype.intentHandlers = {
    PauseIntent: function (intent, session, response) {
        handlePausePlayIntent(response);
    },
    
    UnPauseIntent: function (intent, session, response) {
        handlePausePlayIntent(response);
    },
    StopIntent: function (intent, session, response) {
        handleStopIntent(response);
    },
    NumberIntent : function (intent , session , response) {
        session.attributes[session.attributes[KeyConstants.ChoiceType]] = intent.slots.Number.value;
        var continueIntent = session.attributes[KeyConstants.ContinueIntent];
        this.intentHandlers[continueIntent](intent, session, response);
    },
    SearchMoviesIntent: function (intent, session, response) {
        
        handleSearchMoviesIntent(intent, response);
    },
    FastFormwardIntent: function (intent, session, response) {
        
        handleFastFormwardIntent(intent, response);
    },
    RewindIntent: function (intent, session, response) {
        
        handleFastFormwardIntent(intent, response, true);
    },
    PlayLastEpisodeOfIntent: function (intent, session, response) {
        
        handlePlayRandomIntent(intent, session , response);
    },
    PlayRandomIntent: function (intent, session, response) {
        session.attributes[KeyConstants.ContinueIntent] = 'PlayRandomIntent';
        var context = new KodiContext(intent, session, response);
        handlePlayRandomIntent(context);
    },
    
    PlayLatestIntent: function () {
        
        throw new Error('nope');
    },
    
    HelpIntent: function (intent, session, response) {
        var speechOutput = " you can ask to play  or pause or search.  you stupid idiot.";
        
        
        response.ask(speechOutput);
    }
};

function getValueFromIntentOrSession(key, intent, session) {
    var ret = intent.slots[key] && intent.slots[key].value;
    return ret || session[key];
}

function handlePausePlayIntent(response) {
    
    var xbmc = getClient();
    
    xbmc.player.playPause({
        playerid: 1
    }, function (playPauseResponse) {
        xbmc.close();
        if (!playPauseResponse) {
            response.tell('oops');
        } else {
            response.tell('ok');
        }

    });

}

function handleStopIntent(response) {
    
    var xbmc = getClient();
    
    xbmc.player.stop({
        playerid: 1
    }, function (playPauseResponse) {
        xbmc.close();
        if (!playPauseResponse) {
            response.tell('oops');
        } else {
            response.tell('ok');
        }

    });

}

function getClient() {
    return new SimpleXBMC(appConfig.host, appConfig.port);
}

function handleFastFormwardIntent(intent, response, forRewind) {
    
    var xbmc = getClient();
    var req = [1, ["playlistid", "speed", "position", "totaltime", "time", "percentage", "shuffled", "repeat", "canrepeat", "canshuffle", "canseek", "partymode"]];
    
    var seconds = (intent.slots.Seconds && intent.slots.Seconds.value ? intent.slots.Seconds.value : 0) +
        (intent.slots.Minutes && intent.slots.Minutes.value ? intent.slots.Minutes.value * 60 : 0);
    if (!seconds) {
        response.ask('for how long', 'For how dam long!');
        return;
    }
    if (forRewind) {
        seconds = seconds * -1;
    }
    
    xbmc.player.getProperties(req, function (getPropertiesResp) {
        
        if (!getPropertiesResp || !getPropertiesResp.canseek) {
            xbmc.close();
            response.tell('oops');

        } else {
            var time = new Date(2015, 5, 5, getPropertiesResp.time.hours, getPropertiesResp.time.minutes, getPropertiesResp.time.seconds);
            time.setSeconds(time.getSeconds() + seconds);
            
            req = [1, {
                    "hours": time.getHours(),
                    "minutes": time.getMinutes(),
                    "seconds": time.getSeconds()
                }];
            xbmc.player.seek(req, function (seekResp) {
                xbmc.close();
                if (!seekResp) {
                    response.tell('oops');
                } else {
                    response.tell('ok');
                }
            });
        }

    });
}

function getEpisodes(context, tvShowId, season) {
    var req = {
        tvshowid: tvShowId,
        properties: ['title'],
        // filter: { field: 'title', 'operator': 'contains' , value: tvShow },
        //limits: { start : 0, end: 5 }
    };
    if (season > 0) {
        req.season = season;
    }
    return when.promise(function (resolve, reject) {
        context.getClient().videoLibrary.getEpisodes(req, function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error);
            }
        });
    });
}

function playItem(context , item) {
    return when.promise(function (resolve, reject) {
        context.getClient().player.open([item], function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error);
            }
        });
    });
}

function getShowsByName(context, tvShow) {
    
    var req = {
        properties: ['title'],
        filter: {
            field: 'title',
            'operator': 'contains',
            value: tvShow
        },
        limits: {
            start: 0,
            end: 5
        }
    };
    return when.promise(function (resolve, reject) {
        context.getClient().videoLibrary.getTVShows(req, function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error);
            }
        });
    });

}




function handlePlayRandomIntent(context) {
    
    context.buffer = true;
    var tvShowQuery = context.getField(KeyConstants.TvName),
        season = context.getField(KeyConstants.Season),
        choice = context.getField(KeyConstants.ShowChoice),
        episode = null,
        tvshowid = null,
        processShows,
        processEpisodes,
        processPlay,
        showsPromise;
        
       
    processShowsResult = function (showsResp) {
        if (showsResp.tvshows.length === 1) {
            return getEpisodes(context, showsResp.tvshows[0].tvshowid, season)
                    .then(processEpisodes);
        } else if (showsResp.tvshows.length > 0) {
            var choice = context.getField(KeyConstants.ShowChoice);
            if (choice) {
                var idx = KeyConstants.ShowChoice + (i + 1)
                return getEpisodes(context, showsResp.tvshows[choice - 1].tvshowid, season);
            }
            var resp = "";
            for (var i = 0; i < showsResp.tvshows.length; i++) {
                resp += 'say show ' + (i + 1) + ' for ' + showsResp.tvshows[i].title + '.  ';
                context.setField(KeyConstants.ShowChoice + (i + 1) , showsResp.tvshows[i].tvshowid);
            }
            context.setField(KeyConstants.ContinueIntent, 'PlayRandomIntent');
            context.setField(KeyConstants.ChoiceType, KeyConstants.ShowChoice);
            context.ask(resp, resp);
            
        } else {
            context.tell('show ' + tvShowQuery + ' not found');
        }
    };
    processEpisodes = function (episodeResp) {
        var episodeNumber = Math.floor(Math.random() * episodeResp.episodes.length);
        episode = episodeResp.episodes[episodeNumber];
        return playItem(context, {
            'episodeid': episode.episodeid
        }).then(processPlay);
    };
    processPlay = function (playResponse) {
        context.tell('playing ' + episode.title);
    };
    
    if (choice) {
        tvshowid = context.getField(KeyConstants.ShowChoice + choice);
        showsPromise = when({ tvshows: [{ tvshowid: tvshowid }] });
    } else {
        showsPromise = getShowsByName(context, tvShowQuery);
    }
    
    showsPromise
        .then(processShowsResult)
        .catch(function (error) {
            console.error(error);
        })
        .finally(function () {
            context.flush();
        });
    
}



function handleSearchMoviesIntent(intent, response) {
    
    var movie = intent.slots.MovieName;
    if (!movie || !movie.value) {
        response.ask('what movie', 'what movie dammit!!');
        return;
    }
    var lookFor = movie.value.toLowerCase();
    
    var xbmc = getClient();
    
    xbmc.videoLibrary.getMovies({}, function (getMoviesReponse) {
        var filterdList = getMoviesReponse.movies.filter(function (el) {
            return el.label.toLowerCase().indexOf(lookFor) > -1;
        });
        
        if (filterdList.length > 0) {
            xbmc.player.open([{
                    "movieid": filterdList[0].movieid
                }], function (openResonse) {
                xbmc.close();
                if (!openResonse) {
                    response.tell('oops');
                } else {
                    response.tell('ok');
                }
            });
        } else {
            
            xbmc.close();
            response.tell('didnt find ' + lookFor);
            return;
        }


    });
}


// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the WiseGuy Skill.
    var skill = new KodiSkiLl();
    skill.execute(event, context);
};
