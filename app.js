/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

//ARN - arn:aws:lambda:us-east-1:663361677957:function:Kodi_Skill


var SimpleXBMC = require('./simple-xbmc');
var when = require('when');
/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
var appConfig = require('./config');

var KeyConstants = {
    ContinueAction : 'ContinueAction',
    TvName : 'TvName',
    Episode : 'Episode',
    Movie : 'Movie',
    Season : 'Season',
    ChoiceType : 'ChoiceType',
    MovieChoice : "MovieChoice"
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
        
        session[KeyConstants.ChoiceType] = intent.slots.Number.value;
        var continueIntent = session[KeyConstants.ContinueIntent];
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
        
        handlePlayRandomIntent(intent, response, response);
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

function getEpisodes(client, tvShowId, season) {
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
        client.videoLibrary.getEpisodes(req, function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error)
            }
        });
    });
}

function playItem(client , item) {
    return when.promise(function (resolve, reject) {
        client.player.open([item], function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error)
            }
        });
    });
}

function getShowsByName(client, tvShow) {
    
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
        client.videoLibrary.getTVShows(req, function (resp, error) {
            if (resp) {
                resolve(resp);
            } else {
                reject(error)
            }
        });
    });

}

function respond(config) {
    if (config.client) {
        config.client.close();
    }
    if (config.fn) {
        config.fn.apply(config.response, config.args);
    }
}


function handlePlayRandomIntent(intent, session, response) {
    
    var tvShowQuery , season;
    session[KeyConstants.TvName] = tvShowQuery = getValueFromIntentOrSession(KeyConstants.TvName, intent , session);
    session[KeyConstants.Season] = season = getValueFromIntentOrSession(KeyConstants.Season, intent , session);
    
    
    var client = getClient();
    //todo:  make class
    var responseCfg = {
        response: response,
        client : client
    };
    
    var episode = null;
    var promise = getShowsByName(client, tvShowQuery)
        .then(function (showsResp) {
        if (showsResp.tvshows.length === 1) {
            return getEpisodes(client, showsResp.tvshows[0].tvshowid, season);
        } else if (showsResp.tvshows.length > 0) {
            var resp = "";
            for (var i = 0; i < showsResp.tvshows.length; i++) {
                resp += 'say show ' + (i + 1) + ' for ' + showsResp.tvshows[i].title + '.  ';
            }
            responseCfg.fn = response.ask;
            responseCfg.args = [resp, resp];
        } else {
            responseCfg.fn = response.tell;
            responseCfg.args = ['show ' + tvShowQuery + ' not found'];
        }
        return promise.done(true);
    }).then(function (episodeResp) {
        if (!episodeResp) {
            return;
        }
        var episodeNumber = Math.floor(Math.random() * episodeResp.episodes.length);
        episode = episodeResp.episodes[episodeNumber];
        return playItem(client, {
            "episodeid": episode.episodeid
        });
       
    })
    .then(function (playResponse) {
        if (!playResponse) {
            return;
        }
        responseCfg.fn = response.tell;
        responseCfg.args = ['playing ' + episode.title];

         
    })
    .catch(function (error) {
        console.error(error);
    })
    .finally(function () {
        respond(responseCfg);
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
