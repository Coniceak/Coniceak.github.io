


(function($) {
    
   
    var gQprefix = "gQ_";
    
    
    var STATE_NEW     = 0; 
    var STATE_RUNNING = 1;  
    var STATE_PAUSED  = 2; 
    
   
    var proj = function (elem, angle) {
        switch (elem.geometry){
            case $.gameQuery.GEOMETRY_RECTANGLE :
                var b = angle*Math.PI*2/360;
                var Rx = Math.abs(Math.cos(b)*elem.width/2*elem.factor)+Math.abs(Math.sin(b)*elem.height/2*elem.factor);
                var Ry = Math.abs(Math.cos(b)*elem.height/2*elem.factor)+Math.abs(Math.sin(b)*elem.width/2*elem.factor);

                return {x: Rx, y: Ry};
        }
    };
    
    
    var collide = function(elem1, offset1, elem2, offset2) {
        
        if((elem1.geometry == $.gameQuery.GEOMETRY_RECTANGLE && elem2.geometry == $.gameQuery.GEOMETRY_RECTANGLE)){

            var dx = offset2.x + elem2.boundingCircle.x - elem1.boundingCircle.x - offset1.x;
            var dy = offset2.y + elem2.boundingCircle.y - elem1.boundingCircle.y - offset1.y;
            var a  = Math.atan(dy/dx);

            var Dx = Math.abs(Math.cos(a-elem1.angle*Math.PI*2/360)/Math.cos(a)*dx);
            var Dy = Math.abs(Math.sin(a-elem1.angle*Math.PI*2/360)/Math.sin(a)*dy);

            var R = proj(elem2, elem2.angle-elem1.angle);

            if((elem1.width/2*elem1.factor+R.x <= Dx) || (elem1.height/2*elem1.factor+R.y <= Dy)) {
                return false;
            } else {
                var Dx = Math.abs(Math.cos(a-elem2.angle*Math.PI*2/360)/Math.cos(a)*-dx);
                var Dy = Math.abs(Math.sin(a-elem2.angle*Math.PI*2/360)/Math.sin(a)*-dy);

                var R = proj(elem1, elem1.angle-elem2.angle);

                if((elem2.width/2*elem2.factor+R.x <= Dx) || (elem2.height/2*elem2.factor+R.y <= Dy)) {
                    return false;
                } else {
                    return true;
                }
            }
        } else {
            return false;
        }
    };
    
   
    var offset = function(element) {
      
        var offset = {x: 0, y: 0};
        var parent = element[0];
        
        while(parent !== $.gameQuery.playground[0] && parent.gameQuery !== undefined) {
            offset.x += parent.gameQuery.posx;
            offset.y += parent.gameQuery.posy;
            parent = parent.parentNode;
        }
        
        return offset
    }
    
   
    var visibleTilemapIndexes = function (element, elementOffset) {
        if (elementOffset === undefined) {
            elementOffset = offset(element);   
        }
        
        var gameQuery = element[0].gameQuery;
      
        return {
            firstRow:    Math.max(Math.min(Math.floor(-elementOffset.y/gameQuery.height), gameQuery.sizey), 0),
            lastRow:     Math.max(Math.min(Math.ceil(($.gameQuery.playground[0].height-elementOffset.y)/gameQuery.height), gameQuery.sizey), 0),
            firstColumn: Math.max(Math.min(Math.floor(-elementOffset.x/gameQuery.width), gameQuery.sizex), 0),
            lastColumn:  Math.max(Math.min(Math.ceil(($.gameQuery.playground[0].width-elementOffset.x)/gameQuery.width), gameQuery.sizex), 0) 
        }
    }
    
   
    var bufferedTilemapIndexes = function (element, visible) {
        var gameQuery = element[0].gameQuery;
        
        return {
            firstRow:    Math.max(Math.min(visible.firstRow - gameQuery.buffer, gameQuery.sizey), 0),
            lastRow:     Math.max(Math.min(visible.lastRow + gameQuery.buffer, gameQuery.sizey), 0),
            firstColumn: Math.max(Math.min(visible.firstColumn - gameQuery.buffer, gameQuery.sizex), 0),
            lastColumn:  Math.max(Math.min(visible.lastColumn + gameQuery.buffer, gameQuery.sizex), 0) 
        }
    }
    
   
    var addTile = function(tileSet, row, column) {
        var gameQuery = tileSet[0].gameQuery;
        var name = tileSet.attr("id");
        
        var tileDescription;
        if(gameQuery.func) {
            tileDescription = gameQuery.tiles(row,column)-1;
        } else {
            tileDescription = gameQuery.tiles[row][column]-1;
        }
        
        var animation;
        if(gameQuery.multi) {
            animation = gameQuery.animations;
        } else {
            animation = gameQuery.animations[tileDescription];
        }
        
        if(tileDescription >= 0){
            tileSet.addSprite($.gameQuery.tileIdPrefix+name+"_"+row+"_"+column,
                                  {width: gameQuery.width,
                                   height: gameQuery.height,
                                   posx: column*gameQuery.width,
                                   posy: row*gameQuery.height,
                                   animation: animation});
                                   
            var newTile = tileSet.find("#"+$.gameQuery.tileIdPrefix+name+"_"+row+"_"+column);
            if (gameQuery.multi) {
                newTile.setAnimation(tileDescription);
            } else {
                newTile[0].gameQuery.animationNumber = tileDescription;
            }
            newTile.removeClass($.gameQuery.spriteCssClass);
            newTile.addClass($.gameQuery.tileCssClass);
            newTile.addClass($.gameQuery.tileTypePrefix+tileDescription);
        }
    }
    
    
    $.extend({ gameQuery: {
       
        Animation: function (options, imediateCallback) {
           
            var defaults = {
                imageURL:      "",
                numberOfFrame: 1,
                delta:         0,
                rate:          30,
                type:          0,
                distance:      0,
                offsetx:       0,
                offsety:       0
            };

           
            options = $.extend(defaults, options);

           
            this.imageURL      = options.imageURL;      
            this.numberOfFrame = options.numberOfFrame; 
            this.delta         = options.delta;         
            this.rate          = options.rate;          
            this.type          = options.type;          
            this.distance      = options.distance;      
            this.offsetx       = options.offsetx;       
            this.offsety       = options.offsety;       

            $.gameQuery.resourceManager.addAnimation(this, imediateCallback);

            return true;
        },

         
        ANIMATION_VERTICAL:   1,  
        ANIMATION_HORIZONTAL: 2,  
        ANIMATION_ONCE:       4,  
        ANIMATION_CALLBACK:   8,  
        ANIMATION_MULTI:      16, 
        ANIMATION_PINGPONG:   32, 

        
        GEOMETRY_RECTANGLE:   1,
        GEOMETRY_DISC:        2,

        
        refreshRate:          30,

       
        resourceManager: {
            animations: [],    
            sounds:     [],   
            callbacks:  [],    
            loadedAnimationsPointer: 0, 
            loadedSoundsPointer:    0, 

            
            preload: function() {
                
                for (var i = this.animations.length-1 ; i >= this.loadedAnimationsPointer; i --){
                    this.animations[i].domO = new Image();
                    this.animations[i].domO.src = this.animations[i].imageURL;
                }

                
                for (var i = this.sounds.length-1 ; i >= this.loadedSoundsPointer; i --){
                    this.sounds[i].load();
                }

                $.gameQuery.resourceManager.waitForResources();
            },

            
            waitForResources: function() {
                var imageCount = 0;
                for(var i=this.loadedAnimationsPointer; i < this.animations.length; i++){
                    if(this.animations[i].domO.complete){
                        imageCount++;
                    }
                }
                var soundCount = 0;
                for(var i=this.loadedSoundsPointer; i < this.sounds.length; i++){
                    var temp = this.sounds[i].ready();
                    if(temp){
                        soundCount++;
                    }
                }
                if($.gameQuery.resourceManager.loadCallback){
                    var percent = (imageCount + soundCount)/(this.animations.length + this.sounds.length - this.loadedAnimationsPointer - this.loadedSoundsPointer)*100;
                    $.gameQuery.resourceManager.loadCallback(percent);
                }
                if(imageCount + soundCount < (this.animations.length + this.sounds.length  - this.loadedAnimationsPointer - this.loadedSoundsPointer)){
                    imgWait=setTimeout(function () {
                        $.gameQuery.resourceManager.waitForResources();
                    }, 100);
                } else {
                    this.loadedAnimationsPointer = this.animations.length;
                    this.loadedSoundsPointer = this.sounds.length;
                    
                    $.gameQuery.scenegraph.children().each(function(){
                        $(this).children().each(arguments.callee);
                        if(this.gameQuery && this.gameQuery.animation){
                            $(this).css("background-image", "url("+this.gameQuery.animation.imageURL+")");
                            if(this.gameQuery.animation.type & $.gameQuery.ANIMATION_VERTICAL) {
                                $(this).css("background-repeat", "repeat-x");
                            } else if(this.gameQuery.animation.type & $.gameQuery.ANIMATION_HORIZONTAL) {
                                $(this).css("background-repeat", "repeat-y");
                            } else {
                                $(this).css("background-repeat", "no-repeat");
                            }
                        }
                    });

                    if($.gameQuery.state === STATE_NEW){
                        setInterval(function () {
                            $.gameQuery.resourceManager.refresh();
                        },($.gameQuery.refreshRate));
                    }
                    $.gameQuery.state = STATE_RUNNING;
                    if($.gameQuery.startCallback){
                        $.gameQuery.startCallback();
                    }
                    $.gameQuery.scenegraph.css("visibility","visible");
                }
            },

           
            refreshSprite: function() {
                if(this.gameQuery != undefined){
                    var gameQuery = this.gameQuery;
                    if(gameQuery.animation){
                        if ( (gameQuery.idleCounter == gameQuery.animation.rate-1) && gameQuery.playing){

                            if(gameQuery.animation.type & $.gameQuery.ANIMATION_ONCE){
                                if(gameQuery.currentFrame < gameQuery.animation.numberOfFrame-1){
                                    gameQuery.currentFrame += gameQuery.frameIncrement;
                                } else if(gameQuery.currentFrame == gameQuery.animation.numberOfFrame-1) {
                                    if(gameQuery.animation.type & $.gameQuery.ANIMATION_CALLBACK){
                                        if($.isFunction(gameQuery.callback)){
                                            gameQuery.callback(this);
                                        }
                                    }
                                }
                            } else {
                                if(gameQuery.animation.type & $.gameQuery.ANIMATION_PINGPONG){
                                    if(gameQuery.currentFrame == gameQuery.animation.numberOfFrame-1 && gameQuery.frameIncrement == 1) {
                                        gameQuery.frameIncrement = -1;
                                    } else if (gameQuery.currentFrame == 0 && gameQuery.frameIncrement == -1) {
                                        gameQuery.frameIncrement = 1;
                                    }
                                }

                                gameQuery.currentFrame = (gameQuery.currentFrame+gameQuery.frameIncrement)%gameQuery.animation.numberOfFrame;
                                if(gameQuery.currentFrame == 0){
                                    if(gameQuery.animation.type & $.gameQuery.ANIMATION_CALLBACK){
                                        if($.isFunction(gameQuery.callback)){
                                            gameQuery.callback(this);
                                        }
                                    }
                                }
                            }
                            if((gameQuery.animation.type & $.gameQuery.ANIMATION_VERTICAL) && (gameQuery.animation.numberOfFrame > 1)){
                                if(gameQuery.multi){
                                    $(this).css("background-position",""+(-gameQuery.animation.offsetx-gameQuery.multi)+"px "+(-gameQuery.animation.offsety-gameQuery.animation.delta*gameQuery.currentFrame)+"px");
                                } else {
                                    $(this).css("background-position",""+(-gameQuery.animation.offsetx)+"px "+(-gameQuery.animation.offsety-gameQuery.animation.delta*gameQuery.currentFrame)+"px");
                                }
                            } else if((gameQuery.animation.type & $.gameQuery.ANIMATION_HORIZONTAL) && (gameQuery.animation.numberOfFrame > 1)) {
                                if(gameQuery.multi){
                                    $(this).css("background-position",""+(-gameQuery.animation.offsetx-gameQuery.animation.delta*gameQuery.currentFrame)+"px "+(-gameQuery.animation.offsety-gameQuery.multi)+"px");
                                } else {
                                    $(this).css("background-position",""+(-gameQuery.animation.offsetx-gameQuery.animation.delta*gameQuery.currentFrame)+"px "+(-gameQuery.animation.offsety)+"px");
                                }
                            }
                        }
                        gameQuery.idleCounter = (gameQuery.idleCounter+1)%gameQuery.animation.rate;
                    }
                }
                return true;
            },

            
            refreshTilemap: function() {
                if(this.gameQuery != undefined){
                    var gameQuery = this.gameQuery;
                    if($.isArray(gameQuery.frameTracker)){
                        for(var i=0; i<gameQuery.frameTracker.length; i++){
                            if(gameQuery.idleCounter[i] == gameQuery.animations[i].rate-1){
                                if(gameQuery.animations[i].type & $.gameQuery.ANIMATION_ONCE){
                                    if(gameQuery.frameTracker[i] < gameQuery.animations[i].numberOfFrame-1){
                                        gameQuery.frameTracker[i] += gameQuery.frameIncrement[i];
                                    }
                                } else {
                                    if(gameQuery.animations[i].type & $.gameQuery.ANIMATION_PINGPONG){
                                        if(gameQuery.frameTracker[i] == gameQuery.animations[i].numberOfFrame-1 && gameQuery.frameIncrement[i] == 1) {
                                            gameQuery.frameIncrement[i] = -1;
                                        } else if (gameQuery.frameTracker[i] == 0 && gameQuery.frameIncrement[i] == -1) {
                                            gameQuery.frameIncrement[i] = 1;
                                        }
                                    }
                                    gameQuery.frameTracker[i] = (gameQuery.frameTracker[i]+gameQuery.frameIncrement[i])%gameQuery.animations[i].numberOfFrame;
                                }
                            }
                            gameQuery.idleCounter[i] = (gameQuery.idleCounter[i]+1)%gameQuery.animations[i].rate;
                        }
                    } else {
                        if(gameQuery.idleCounter == gameQuery.animations.rate-1){
                            if(gameQuery.animations.type & $.gameQuery.ANIMATION_ONCE){
                                if(gameQuery.frameTracker < gameQuery.animations.numberOfFrame-1){
                                    gameQuery.frameTracker += gameQuery.frameIncrement;
                                }
                            } else {
                                if(gameQuery.animations.type & $.gameQuery.ANIMATION_PINGPONG){
                                    if(gameQuery.frameTracker == gameQuery.animations.numberOfFrame-1 && gameQuery.frameIncrement == 1) {
                                        gameQuery.frameIncrement = -1;
                                    } else if (gameQuery.frameTracker == 0 && gameQuery.frameIncrement == -1) {
                                        gameQuery.frameIncrement = 1;
                                    }
                                }
                                gameQuery.frameTracker = (gameQuery.frameTracker+gameQuery.frameIncrement)%gameQuery.animations.numberOfFrame;
                            }
                        }
                        gameQuery.idleCounter = (gameQuery.idleCounter+1)%gameQuery.animations.rate;
                    }


                    $(this).find("."+$.gameQuery.tileCssClass).each(function(){
                        if($.isArray(gameQuery.frameTracker)){
                            var animationNumber = this.gameQuery.animationNumber
                            if((gameQuery.animations[animationNumber].type & $.gameQuery.ANIMATION_VERTICAL) && (gameQuery.animations[animationNumber].numberOfFrame > 1)){
                                $(this).css("background-position",""+(-gameQuery.animations[animationNumber].offsetx)+"px "+(-gameQuery.animations[animationNumber].offsety-gameQuery.animations[animationNumber].delta*gameQuery.frameTracker[animationNumber])+"px");
                            } else if((gameQuery.animations[animationNumber].type & $.gameQuery.ANIMATION_HORIZONTAL) && (gameQuery.animations[animationNumber].numberOfFrame > 1)) {
                                $(this).css("background-position",""+(-gameQuery.animations[animationNumber].offsetx-gameQuery.animations[animationNumber].delta*gameQuery.frameTracker[animationNumber])+"px "+(-gameQuery.animations[animationNumber].offsety)+"px");
                            }
                        } else {
                            if((gameQuery.animations.type & $.gameQuery.ANIMATION_VERTICAL) && (gameQuery.animations.numberOfFrame > 1)){
                                $(this).css("background-position",""+(-gameQuery.animations.offsetx-this.gameQuery.multi)+"px "+(-gameQuery.animations.offsety-gameQuery.animations.delta*gameQuery.frameTracker)+"px");
                            } else if((gameQuery.animations.type & $.gameQuery.ANIMATION_HORIZONTAL)  && (gameQuery.animations.numberOfFrame > 1)) {
                                $(this).css("background-position",""+(-gameQuery.animations.offsetx-gameQuery.animations.delta*gameQuery.frameTracker)+"px "+(-gameQuery.animations.offsety-this.gameQuery.multi)+"px");
                            }
                        }
                    });
                }
                return true;
            },

           
            refresh: function() {
                if($.gameQuery.state === STATE_RUNNING) {
                    $.gameQuery.playground.find("."+$.gameQuery.spriteCssClass).each(this.refreshSprite);
                    $.gameQuery.playground.find("."+$.gameQuery.tilemapCssClass).each(this.refreshTilemap);
                    var deadCallback= new Array();
                    for (var i = this.callbacks.length-1; i >= 0; i--){
                        if(this.callbacks[i].idleCounter == this.callbacks[i].rate-1){
                            var returnedValue = this.callbacks[i].fn();
                            if(typeof returnedValue == 'boolean'){
                                if(returnedValue){
                                    deadCallback.push(i);
                                }
                            } else if(typeof returnedValue == 'number') {
                                this.callbacks[i].rate = Math.round(returnedValue/$.gameQuery.refreshRate);
                                this.callbacks[i].idleCounter = 0;
                            }
                        }
                        this.callbacks[i].idleCounter = (this.callbacks[i].idleCounter+1)%this.callbacks[i].rate;
                    }
                    for(var i = deadCallback.length-1; i >= 0; i--){
                        this.callbacks.splice(deadCallback[i],1);
                    }
                }
            },

            
            addAnimation: function(animation, callback) {
                if($.inArray(animation,this.animations)<0){
                    animation.rate = Math.round(animation.rate/$.gameQuery.refreshRate);
                    if(animation.rate==0){
                        animation.rate = 1;
                    }
                    this.animations.push(animation);
                    switch ($.gameQuery.state){
                        case STATE_NEW:
                        case STATE_PAUSED:
                            break;
                        case STATE_RUNNING:
                            this.animations[this.loadedAnimationsPointer].domO = new Image();
                            this.animations[this.loadedAnimationsPointer].domO.src = animation.imageURL;
                            if (callback !== undefined){
                                this.animations[this.loadedAnimationsPointer].domO.onload = callback;
                            }
                            this.loadedAnimationsPointer++;
                            break;
                    }
                }
            },
            
            
            addSound: function(sound, callback){
                if($.inArray(sound,this.sounds)<0){
                    this.sounds.push(sound);
                    switch ($.gameQuery.state){
                        case STATE_NEW:
                        case STATE_PAUSED:
                            break;
                        case STATE_RUNNING:
                            sound.load();
                            this.loadedSoundsPointer++;
                            break;
                    }
                }
            },

           
            registerCallback: function(fn, rate){
                rate  = Math.round(rate/$.gameQuery.refreshRate);
                if(rate==0){
                    rate = 1;
                }
                this.callbacks.push({fn: fn, rate: rate, idleCounter: 0});
            },
            
           
            clear: function(callbacksToo){
                this.animations  = [];
                this.loadedAnimationsPointer = 0;
                this.sounds = [];
                this.loadedSoundsPointer = 0;
                if(callbacksToo) {
                    this.callbacks = [];
                }
            }
        },

        
        update: function(descriptor, transformation) {
            if(!$.isPlainObject(descriptor)){
                if(descriptor.length > 0){
                    var gameQuery = descriptor[0].gameQuery;
                } else {
                    var gameQuery = descriptor.gameQuery;
                }
            } else {
                var gameQuery = descriptor;
            }
            if(!gameQuery) return;
            if(gameQuery.tileSet === true){
                
                var visible = visibleTilemapIndexes(descriptor);
                var buffered = gameQuery.buffered;
                
                for(property in transformation){
                    switch(property){
                        case "x":
                        
                            if(visible.lastColumn > buffered.lastColumn) {
                                
                                var parent = descriptor[0].parentNode;
                                var tilemap = descriptor.detach();
                                
                                var newBuffered = bufferedTilemapIndexes(descriptor, visible);
                                for(var i = gameQuery.buffered.firstRow; i < gameQuery.buffered.lastRow; i++){
                                    for(var j = gameQuery.buffered.firstColumn; j < Math.min(newBuffered.firstColumn, gameQuery.buffered.lastColumn); j++) {
                                        tilemap.find("#"+$.gameQuery.tileIdPrefix+descriptor.attr("id")+"_"+i+"_"+j).remove();
                                    }
                                    for(var j = Math.max(gameQuery.buffered.lastColumn,newBuffered.firstColumn); j < newBuffered.lastColumn ; j++) {
                                        addTile(tilemap,i,j);
                                    }
                                }
                                
                                gameQuery.buffered.firstColumn = newBuffered.firstColumn;
                                gameQuery.buffered.lastColumn  = newBuffered.lastColumn;
                                
                                tilemap.appendTo(parent);
                                
                            }
                            
                            if(visible.firstColumn < buffered.firstColumn) {
                                
                                var parent = descriptor[0].parentNode;
                                var tilemap = descriptor.detach();
                                    
                                var newBuffered = bufferedTilemapIndexes(descriptor, visible);
                                for(var i = gameQuery.buffered.firstRow; i < gameQuery.buffered.lastRow; i++){
                                    for(var j = Math.max(newBuffered.lastColumn,gameQuery.buffered.firstColumn); j < gameQuery.buffered.lastColumn ; j++) {
                                        tilemap.find("#"+$.gameQuery.tileIdPrefix+descriptor.attr("id")+"_"+i+"_"+j).remove();
                                    }
                                    for(var j = newBuffered.firstColumn; j < Math.min(gameQuery.buffered.firstColumn,newBuffered.lastColumn); j++) {
                                        addTile(tilemap,i,j);
                                    }
                                }
                                
                                gameQuery.buffered.firstColumn = newBuffered.firstColumn;
                                gameQuery.buffered.lastColumn  = newBuffered.lastColumn;
                                
                                tilemap.appendTo(parent);
                            }
                            break;
                            
                        case "y":
                        
                            if(visible.lastRow > buffered.lastRow) {
                                
                                var parent = descriptor[0].parentNode;
                                var tilemap = descriptor.detach();
                                
                                var newBuffered = bufferedTilemapIndexes(descriptor, visible);
                                for(var j = gameQuery.buffered.firstColumn; j < gameQuery.buffered.lastColumn ; j++) {
                                    for(var i = gameQuery.buffered.firstRow; i < Math.min(newBuffered.firstRow, gameQuery.buffered.lastRow); i++){
                                        tilemap.find("#"+$.gameQuery.tileIdPrefix+descriptor.attr("id")+"_"+i+"_"+j).remove();
                                    }
                                    for(var i = Math.max(gameQuery.buffered.lastRow, newBuffered.firstRow); i < newBuffered.lastRow; i++){
                                        addTile(tilemap,i,j);
                                    }
                                }
                                
                                gameQuery.buffered.firstRow = newBuffered.firstRow;
                                gameQuery.buffered.lastRow  = newBuffered.lastRow;
                                
                                tilemap.appendTo(parent);
                                
                            }  
                            
                            if(visible.firstRow < buffered.firstRow) {
                                
                                var parent = descriptor[0].parentNode;
                                var tilemap = descriptor.detach();
                                
                                var newBuffered = bufferedTilemapIndexes(descriptor, visible);
                                for(var j = gameQuery.buffered.firstColumn; j < gameQuery.buffered.lastColumn ; j++) {
                                    for(var i = Math.max(newBuffered.lastRow, gameQuery.buffered.firstRow); i < gameQuery.buffered.lastRow; i++){
                                        tilemap.find("#"+$.gameQuery.tileIdPrefix+descriptor.attr("id")+"_"+i+"_"+j).remove();
                                    }
                                    for(var i = newBuffered.firstRow; i < Math.min(gameQuery.buffered.firstRow, newBuffered.lastRow); i++){
                                        addTile(tilemap,i,j);
                                    }
                                }
                                
                                gameQuery.buffered.firstRow = newBuffered.firstRow;
                                gameQuery.buffered.lastRow  = newBuffered.lastRow;
                                
                                tilemap.appendTo(parent);
                            }
                            break;
                            
                        case "angle":
                          
                            break;
                            
                        case "factor":
                            break;
                    }
                }

            } else {
                var refreshBoundingCircle = $.gameQuery.playground && !$.gameQuery.playground.disableCollision;

                for(property in transformation){
                    switch(property){
                        case "x":
                            if(refreshBoundingCircle){
                                gameQuery.boundingCircle.x = gameQuery.posx+gameQuery.width/2;
                            }
                            break;
                        case "y":
                            if(refreshBoundingCircle){
                                gameQuery.boundingCircle.y = gameQuery.posy+gameQuery.height/2;
                            }
                            break;
                        case "w":
                        case "h":
                            gameQuery.boundingCircle.originalRadius = Math.sqrt(Math.pow(gameQuery.width,2) + Math.pow(gameQuery.height,2))/2
                            gameQuery.boundingCircle.radius = gameQuery.factor*gameQuery.boundingCircle.originalRadius;
                            break;
                        case "angle": 
                            gameQuery.angle = parseFloat(transformation.angle);
                            break;
                        case "factor":
                            gameQuery.factor = parseFloat(transformation.factor);
                            if(refreshBoundingCircle){
                                gameQuery.boundingCircle.radius = gameQuery.factor*gameQuery.boundingCircle.originalRadius;
                            }
                            break;
                    }
                }
            }
        },
        state: STATE_NEW,
        
        spriteCssClass:  gQprefix + "sprite",
        groupCssClass:   gQprefix + "group",
        tilemapCssClass: gQprefix + "tilemap",
        tileCssClass:    gQprefix + "tile",
        tileTypePrefix:  gQprefix + "tileType_",
        tileIdPrefix:    gQprefix + "tile_"
    },

   
    muteSound: function(muted){
        for (var i = $.gameQuery.resourceManager.sounds.length-1 ; i >= 0; i --) {
            $.gameQuery.resourceManager.sounds[i].muted(muted);
        }
    },
    
  
    playground: function() {
        return $.gameQuery.playground
    },
    
    
    loadCallback: function(callback){
        $.gameQuery.resourceManager.loadCallback = callback;
    }
    }); 


    
    var spriteFragment  = $("<div class='"+$.gameQuery.spriteCssClass+"'  style='position: absolute; display: block; overflow: hidden' />");
    var groupFragment   = $("<div class='"+$.gameQuery.groupCssClass+"'  style='position: absolute; display: block; overflow: hidden' />");
    var tilemapFragment = $("<div class='"+$.gameQuery.tilemapCssClass+"' style='position: absolute; display: block; overflow: hidden;' />");


    $.fn.extend({
        
        playground: function(options) {
            if(this.length == 1){
                if(this[0] == document){ 
                    throw "Old playground usage, use $.playground() to retreive the playground and $('mydiv').playground(options) to set the div!";
                }
                options = $.extend({
                    height:        320,
                    width:        480,
                    refreshRate: 30,
                    position:    "absolute",
                    keyTracker:    false,
                    mouseTracker: false,
                    disableCollision: false
                }, options);
                $.gameQuery.playground = this;
                $.gameQuery.refreshRate = options.refreshRate;
                $.gameQuery.playground[0].height = options.height;
                $.gameQuery.playground[0].width = options.width;

                $.gameQuery.playground.css({
                        position: options.position,
                        display:  "block",
                        overflow: "hidden",
                        height:   options.height+"px",
                        width:    options.width+"px"
                    })
                    .append("<div id='"+gQprefix+"scenegraph' style='visibility: hidden'/>");

                $.gameQuery.scenegraph = $("#"+gQprefix+"scenegraph");

                $.gameQuery.keyTracker = {};
                if(options.keyTracker){
                    $(document).keydown(function(event){
                        $.gameQuery.keyTracker[event.keyCode] = true;
                    });
                    $(document).keyup(function(event){
                        $.gameQuery.keyTracker[event.keyCode] = false;
                    });
                }
                
                 $.gameQuery.mouseTracker = {
                    x: 0,
                    y: 0};
                var scenegraphOffset = $.gameQuery.playground.offset();
                if(options.mouseTracker){
                    $($.gameQuery.playground).mousemove(function(event){
                        $.gameQuery.mouseTracker.x = event.pageX - scenegraphOffset.left;
                        $.gameQuery.mouseTracker.y = event.pageY - scenegraphOffset.top;
                    });
                    $(document).mousedown(function(event){
                        $.gameQuery.mouseTracker[event.which] = true;
                    });
                    $(document).mouseup(function(event){
                        $.gameQuery.mouseTracker[event.which] = false;
                    });
                }
            }
            return this;
        },

       
        startGame: function(callback) {
            $.gameQuery.startCallback = callback;
            $.gameQuery.resourceManager.preload();
            return this;
        },
        
       
        pauseGame: function() {
            $.gameQuery.state = STATE_PAUSED;
            $.gameQuery.scenegraph.css("visibility","hidden");
            return this;
        },
        
        
        resumeGame: function(callback) {
            if($.gameQuery.state === STATE_PAUSED){
                $.gameQuery.startCallback = callback;
                $.gameQuery.resourceManager.preload();
            }
            return this;
        },

       
        clearScenegraph: function() {
            $.gameQuery.scenegraph.empty()
            return this;
        },
        
        
        clearAll: function(callbackToo) {
            $.gameQuery.scenegraph.empty();
            $.gameQuery.resourceManager.clear(callbackToo)
            return this;
        },

       
        addGroup: function(group, options) {
            options = $.extend({
                width:      32,
                height:     32,
                posx:       0,
                posy:       0,
                posz:       0,
                posOffsetX: 0,
                posOffsetY: 0,
                overflow:   "visible",
                geometry:   $.gameQuery.GEOMETRY_RECTANGLE,
                angle:      0,
                factor:     1,
                factorh:    1,
                factorv:    1
            }, options);

            var newGroupElement = groupFragment.clone().attr("id",group).css({
                    overflow: options.overflow,
                    top:      options.posy,
                    left:     options.posx,
                    height:   options.height,
                    width:    options.width
                });
            
            if(this == $.gameQuery.playground){
                $.gameQuery.scenegraph.append(newGroupElement);
            } else if ((this == $.gameQuery.scenegraph)||(this.hasClass($.gameQuery.groupCssClass))){
                this.append(newGroupElement);
            }
            newGroupElement[0].gameQuery = options;
            newGroupElement[0].gameQuery.boundingCircle = {x: options.posx + options.width/2,
                                                    y: options.posy + options.height/0,
                                                    originalRadius: Math.sqrt(Math.pow(options.width,2) + Math.pow(options.height,2))/2};
            newGroupElement[0].gameQuery.boundingCircle.radius = newGroupElement[0].gameQuery.boundingCircle.originalRadius;
            newGroupElement[0].gameQuery.group = true;
            return this.pushStack(newGroupElement);
        },

       
        addSprite: function(sprite, options) {
            options = $.extend({
                width:          32,
                height:         32,
                posx:           0,
                posy:           0,
                posz:           0,
                posOffsetX:     0,
                posOffsetY:     0,
                idleCounter:    0,
                currentFrame:   0,
                frameIncrement: 1,
                geometry:       $.gameQuery.GEOMETRY_RECTANGLE,
                angle:          0,
                factor:         1,
                playing:        true,
                factorh:        1,
                factorv:        1
            }, options);

            var newSpriteElem = spriteFragment.clone().attr("id",sprite).css({
                     height: options.height,
                     width: options.width,
                     left: options.posx,
                     top: options.posy,
                     backgroundPosition: ((options.animation)? -options.animation.offsetx : 0)+"px "+((options.animation)? -options.animation.offsety : 0)+"px"
                });
                
            if(this == $.gameQuery.playground){
                $.gameQuery.scenegraph.append(newSpriteElem);
            } else {
                this.append(newSpriteElem);
            }

            if(options.animation){
                if($.gameQuery.state === STATE_RUNNING && options.animation.imageURL !== ''){
                    newSpriteElem.css("background-image", "url("+options.animation.imageURL+")");
                }
                if(options.animation.type & $.gameQuery.ANIMATION_VERTICAL) {
                    newSpriteElem.css("background-repeat", "repeat-x");
                } else if(options.animation.type & $.gameQuery.ANIMATION_HORIZONTAL) {
                    newSpriteElem.css("background-repeat", "repeat-y");
                } else {
                    newSpriteElem.css("background-repeat", "no-repeat");
                }
            }


            var spriteDOMObject = newSpriteElem[0];
            if(spriteDOMObject != undefined){
                spriteDOMObject.gameQuery = options;
                spriteDOMObject.gameQuery.boundingCircle = {x: options.posx + options.width/2,
                                                            y: options.posy + options.height/2,
                                                            originalRadius: Math.sqrt(Math.pow(options.width,2) + Math.pow(options.height,2))/2};
                spriteDOMObject.gameQuery.boundingCircle.radius = spriteDOMObject.gameQuery.boundingCircle.originalRadius;
            }
            return this;
        },

        
        addTilemap: function(name, tileDescription, animationList, options){
            options = $.extend({
                width:          32,
                height:         32,
                sizex:          32,
                sizey:          32,
                posx:           0,
                posy:           0,
                posz:           0,
                posOffsetX:     0,
                posOffsetY:     0,
                factorh:        1,
                factorv:        1,
                buffer:         1
            }, options);

            var tileSet = tilemapFragment.clone().attr("id",name).css({
                    top: options.posy, 
                    left: options.posx, 
                    height: options.height*options.sizey, 
                    width: options.width*options.sizex
                });
            
            if(this == $.gameQuery.playground){
                $.gameQuery.scenegraph.append(tileSet);
            } else {
                this.append(tileSet);
            }
            
            tileSet[0].gameQuery = options;
            var gameQuery = tileSet[0].gameQuery;
            gameQuery.tileSet = true;
            gameQuery.tiles = tileDescription;
            gameQuery.func = (typeof tileDescription === "function");
                
            if($.isArray(animationList)){
                var frameTracker = [];
                var idleCounter = [];
                var frameIncrement = [];
                for(var i=0; i<animationList.length; i++){
                    frameTracker[i] = 0;
                    idleCounter[i] = 0;
                    frameIncrement[i] = 1;
                }
                gameQuery.frameTracker = frameTracker;
                gameQuery.animations = animationList;
                gameQuery.idleCounter =  idleCounter;
                gameQuery.frameIncrement = frameIncrement;
                gameQuery.multi = false;
            } else {
                gameQuery.frameTracker = 0;
                gameQuery.frameIncrement = 1;
                gameQuery.animations = animationList;
                gameQuery.idleCounter =  0;
                gameQuery.multi = true;
                
            }

            var visible = visibleTilemapIndexes(tileSet);
            var buffered = bufferedTilemapIndexes(tileSet, visible);
            gameQuery.buffered = buffered;

            for(var i = buffered.firstRow; i < buffered.lastRow; i++){
                for(var j = buffered.firstColumn; j < buffered.lastColumn ; j++) {
                    addTile(tileSet, i, j);
                }
            }
            
            return this.pushStack(tileSet);
        },

       
        pauseAnimation: function() {
            this[0].gameQuery.playing = false;
            return this;
        },

        
        resumeAnimation: function() {
            this[0].gameQuery.playing = true;
            return this;
        },

       
        setAnimation: function(animation, callback) {
            var gameQuery = this[0].gameQuery;
            if(typeof animation == "number"){
                if(gameQuery.animation.type & $.gameQuery.ANIMATION_MULTI){
                    var distance = gameQuery.animation.distance * animation;
                    gameQuery.multi = distance;
                    gameQuery.frameIncrement = 1;
                    gameQuery.currentFrame = 0;
                    
                    if(gameQuery.animation.type & $.gameQuery.ANIMATION_VERTICAL) {
                        this.css("background-position",""+(-distance-gameQuery.animation.offsetx)+"px "+(-gameQuery.animation.offsety)+"px");
                    } else if(gameQuery.animation.type & $.gameQuery.ANIMATION_HORIZONTAL) {
                        this.css("background-position",""+(-gameQuery.animation.offsetx)+"px "+(-distance-gameQuery.animation.offsety)+"px");
                    }
                }
            } else {
                if(animation){
                    gameQuery.animation = animation;
                    gameQuery.currentFrame = 0;
                    gameQuery.frameIncrement = 1;

                    if (animation.imageURL !== '') {this.css("backgroundImage", "url('"+animation.imageURL+"')");}
                    this.css({"background-position": ""+(-animation.offsetx)+"px "+(-animation.offsety)+"px"});

                    if(gameQuery.animation.type & $.gameQuery.ANIMATION_VERTICAL) {
                        this.css("background-repeat", "repeat-x");
                    } else if(gameQuery.animation.type & $.gameQuery.ANIMATION_HORIZONTAL) {
                        this.css("background-repeat", "repeat-y");
                    } else {
                        this.css("background-repeat", "no-repeat");
                    }
                } else {
                    this.css("background-image", "");
                }
            }

            if(callback != undefined){
                this[0].gameQuery.callback = callback;
            }

            return this;
        },

       
        registerCallback: function(fn, rate) {
            $.gameQuery.resourceManager.registerCallback(fn, rate);
            return this;
        },

       
        collision: function(arg1, arg2){
            var filter, override;
            if ($.isPlainObject(arg1)){
                override = arg1;
            } else if (typeof arg1 === "string") {
                filter = arg1;
            }
            if ($.isPlainObject(arg2)){
                override = arg2;
            } else if (typeof arg2 === "string") {
                filter = arg2;
            }
            
            var resultList = [];

            var itsParent = this[0].parentNode, offsetX = 0, offsetY = 0;
            while (itsParent != $.gameQuery.playground[0]){
                    if(itsParent.gameQuery){
                    offsetX += itsParent.gameQuery.posx;
                    offsetY += itsParent.gameQuery.posy;
                }
                itsParent = itsParent.parentNode;
            }

            var pgdGeom = {top: 0, left: 0, bottom: $.playground().height(), right: $.playground().width()};

            var gameQuery = jQuery.extend(true, {}, this[0].gameQuery);

            var boundingCircle = jQuery.extend(true, {}, gameQuery.boundingCircle);
            if(override && override.w){
                gameQuery.width = override.w;
            }
            if(override && override.h){
                gameQuery.height = override.h;
            }
            boundingCircle.originalRadius = Math.sqrt(Math.pow(gameQuery.width,2) + Math.pow(gameQuery.height,2))/2
            boundingCircle.radius = gameQuery.factor*boundingCircle.originalRadius;
            
            if(override && override.x){
                boundingCircle.x = override.x + gameQuery.width/2.0;
            }
            if(override && override.y){
                boundingCircle.y = override.y + gameQuery.height/2.0;
            }
            
            gameQuery.boundingCircle = boundingCircle;
            

            if( (gameQuery.boundingCircle.y + gameQuery.boundingCircle.radius + offsetY < pgdGeom.top)    ||
                (gameQuery.boundingCircle.x + gameQuery.boundingCircle.radius + offsetX < pgdGeom.left)   ||
                (gameQuery.boundingCircle.y - gameQuery.boundingCircle.radius + offsetY > pgdGeom.bottom) ||
                (gameQuery.boundingCircle.x - gameQuery.boundingCircle.radius + offsetX > pgdGeom.right)){
                return this.pushStack(new $([]));
            }

            if(this !== $.gameQuery.playground){
                var elementsToCheck = new Array();
                elementsToCheck.push($.gameQuery.scenegraph.children(filter).get());
                elementsToCheck[0].offsetX = 0;
                elementsToCheck[0].offsetY = 0;

                for(var i = 0, len = elementsToCheck.length; i < len; i++) {
                    var subLen = elementsToCheck[i].length;
                    while(subLen--){
                        var elementToCheck = elementsToCheck[i][subLen];
                        if(elementToCheck.gameQuery){
                            if(!elementToCheck.gameQuery.group && !elementToCheck.gameQuery.tileSet){
                                if(this[0]!=elementToCheck){
                                    var distance = Math.sqrt(Math.pow(offsetY + gameQuery.boundingCircle.y - elementsToCheck[i].offsetY - elementToCheck.gameQuery.boundingCircle.y, 2) + Math.pow(offsetX + gameQuery.boundingCircle.x - elementsToCheck[i].offsetX - elementToCheck.gameQuery.boundingCircle.x, 2));
                                    if(distance - gameQuery.boundingCircle.radius - elementToCheck.gameQuery.boundingCircle.radius <= 0){
                                        if(collide(gameQuery, {x: offsetX, y: offsetY}, elementToCheck.gameQuery, {x: elementsToCheck[i].offsetX, y: elementsToCheck[i].offsetY})) {
                                            resultList.push(elementsToCheck[i][subLen]);
                                        }
                                    }
                                }
                            }
                            var eleChildren = $(elementToCheck).children(filter);
                            if(eleChildren.length){
                                elementsToCheck.push(eleChildren.get());
                                elementsToCheck[len].offsetX = elementToCheck.gameQuery.posx + elementsToCheck[i].offsetX;
                                elementsToCheck[len].offsetY = elementToCheck.gameQuery.posy + elementsToCheck[i].offsetY;
                                len++;
                            }
                        }
                    }
                }
                return this.pushStack($(resultList));
            }
        },


        addSound: function(sound, add) {
            if($.gameQuery.SoundWrapper) {
                var gameQuery = this[0].gameQuery;
                if(add) {
                    var sounds = gameQuery.sounds;
                    if(sounds) {
                        sounds.push(sound);
                    } else {
                        gameQuery.sounds = [sound];
                    }
                } else {
                    gameQuery.sounds = [sound];
                }
            }
            return this;
        },

        
        playSound: function() {
            $(this).each(function(){
                var gameQuery = this.gameQuery;
                if(gameQuery.sounds) {
                    for(var i = gameQuery.sounds.length-1 ; i >= 0; i --) {
                        gameQuery.sounds[i].play();
                    }
                }
            });

            return this;
        },

       
        stopSound: function() {
            $(this).each(function(){
                var gameQuery = this.gameQuery;
                if(gameQuery.sounds) {
                    for(var i = gameQuery.sounds.length-1 ; i >= 0; i --) {
                        gameQuery.sounds[i].stop();
                    }
                }
            });
            return this;
        },


        

        pauseSound: function() {
            $(this).each(function(){
                var gameQuery = this.gameQuery;
                if(gameQuery.sounds) {
                    for(var i = gameQuery.sounds.length-1 ; i >= 0; i --) {
                        gameQuery.sounds[i].pause();
                    }
                }
            });
            return this;
        },


        
        muteSound: function(muted) {
            $(this).each(function(){
                var gameQuery = this.gameQuery;
                if(gameQuery.sounds) {
                    for(var i = gameQuery.sounds.length-1 ; i >= 0; i --) {
                        gameQuery.sounds[i].muted(muted);
                    }
                }
            });
            return this;
        },



        transform: function(angle, factor) {
            var gameQuery = this[0].gameQuery;
            $.gameQuery.update(gameQuery,{angle: angle, factor: factor});

            if(this.css("MozTransform")) {
                var transform = "rotate("+angle+"deg) scale("+(factor*gameQuery.factorh)+","+(factor*gameQuery.factorv)+")";
                this.css("MozTransform",transform);
            } else if(this.css("-o-transform")) {
                var transform = "rotate("+angle+"deg) scale("+(factor*gameQuery.factorh)+","+(factor*gameQuery.factorv)+")";
                this.css("-o-transform",transform);
            } else if(this.css("msTransform")!==null && this.css("msTransform")!==undefined) {
                var transform = "rotate("+angle+"deg) scale("+(factor*gameQuery.factorh)+","+(factor*gameQuery.factorv)+")";
                this.css("msTransform",transform);
            } else if(this.css("WebkitTransform")!==null && this.css("WebkitTransform")!==undefined) {
                var transform = "rotate("+angle+"deg) scale("+(factor*gameQuery.factorh)+","+(factor*gameQuery.factorv)+")";
                this.css("WebkitTransform",transform);
            } else if(this.css("filter")!==undefined){
                var angle_rad = Math.PI * 2 / 360 * angle;
                var cos = Math.cos(angle_rad) * factor;
                var sin = Math.sin(angle_rad) * factor;
                this.css("filter","progid:DXImageTransform.Microsoft.Matrix(M11="+(cos*gameQuery.factorh)+",M12="+(-sin*gameQuery.factorv)+",M21="+(sin*gameQuery.factorh)+",M22="+(cos*gameQuery.factorv)+",SizingMethod='auto expand',FilterType='nearest neighbor')");
                var newWidth = this.width();
                var newHeight = this.height();
                gameQuery.posOffsetX = (newWidth-gameQuery.width)/2;
                gameQuery.posOffsetY = (newHeight-gameQuery.height)/2;

                this.css("left", ""+(gameQuery.posx-gameQuery.posOffsetX)+"px");
                this.css("top", ""+(gameQuery.posy-gameQuery.posOffsetY)+"px");
            }
            return this;
        },

        
        rotate: function(angle){
            var gameQuery = this[0].gameQuery;

            if(angle !== undefined) {
                return this.transform(angle % 360, this.scale());
            } else {
                var ang = gameQuery.angle;
                return ang ? ang : 0;
            }
        },

        
        scale: function(factor){
            var gameQuery = this[0].gameQuery;

            if(factor !== undefined) {
                return this.transform(this.rotate(), factor);
            } else {
                var fac = gameQuery.factor;
                return fac ? fac : 1;
            }
        },

      
        fliph: function(flip){
            var gameQuery = this[0].gameQuery;

            if (flip === undefined) {
                return (gameQuery.factorh !== undefined) ? (gameQuery.factorh === -1) : false;
            } else if (flip) {
                gameQuery.factorh = -1;
            } else {
                gameQuery.factorh = 1;
            }

            return this.transform(this.rotate(), this.scale());
        },

       
        flipv: function(flip){
            var gameQuery = this[0].gameQuery;

            if (flip === undefined) {
                return (gameQuery.factorv !== undefined) ? (gameQuery.factorv === -1) : false;;
            } else if (flip) {
                gameQuery.factorv = -1;
            } else {
                gameQuery.factorv = 1;
            }

            return this.transform(this.rotate(), this.scale());
        },


        xyz: function(x, y, z, relative) {
             if (x === undefined) {
                 return this.getxyz();
             } else {
                 return this.setxyz({x: x, y: y, z: z}, relative);
             }
        },

       
        x: function(value, relative) {
             if (value === undefined) {
                 return this.getxyz().x;
             } else {
                 return this.setxyz({x: value}, relative);
             }
        },

        y: function(value, relative) {
             if (value === undefined) {
                 return this.getxyz().y;
             } else {
                 return this.setxyz({y: value}, relative);
             }
        },

        z: function(value, relative) {
             if (value === undefined) {
                 return this.getxyz().z;
             } else {
                 return this.setxyz({z: value}, relative);
             }
        },

        xy: function(x, y, relative) {
             if (x === undefined) {
                 return this.getxyz();
             } else {
                 return this.setxyz({x: x, y: y}, relative);
             }
        },

       
        wh: function(w, h, relative) {
            if (w === undefined) {
                 return this.getwh();
             } else {
                 return this.setwh({w: w, h: h}, relative);
             }
        },

       
        w: function(value, relative) {
            if (value === undefined) {
                 return this.getwh().w;
             } else {
                 return this.setwh({w: value}, relative);
             }
        },

        h: function(value, relative) {
            if (value === undefined) {
                 return this.getwh().h;
             } else {
                 return this.setwh({h: value}, relative);
             }
        },

       
        getxyz: function() {
            var gameQuery = this[0].gameQuery;
            return {x: gameQuery.posx, y: gameQuery.posy, z: gameQuery.posz};
        },

        setxyz: function(option, relative) {
            var gameQuery = this[0].gameQuery;

            for (coordinate in option) {
                switch (coordinate) {
                    case 'x':
                        if(relative) {
                            option.x += gameQuery.posx;
                        }
                        gameQuery.posx = option.x;
                        this.css("left",""+(gameQuery.posx + gameQuery.posOffsetX)+"px");
                        
                        this.find("."+$.gameQuery.tilemapCssClass).each(function(){
                            $(this).x(0, true);
                        });
                        break;

                    case 'y':
                        if(relative) {
                            option.y += gameQuery.posy;
                        }
                        gameQuery.posy = option.y;
                        this.css("top",""+(gameQuery.posy + gameQuery.posOffsetY)+"px");
                        
                        this.find("."+$.gameQuery.tilemapCssClass).each(function(){
                            $(this).y(0, true);
                        });
                        break;

                    case 'z':
                        if(relative) {
                            option.z += gameQuery.posz;
                        }
                        gameQuery.posz = option.z;
                        this.css("z-index",gameQuery.posz);
                        break;
                }
            }
            $.gameQuery.update(this, option);
            return this;
        },

        getwh: function() {
            var gameQuery = this[0].gameQuery;
            return {w: gameQuery.width, h: gameQuery.height};
        },

        setwh: function(option, relative) {
            var gameQuery = this[0].gameQuery;

            for (coordinate in option) {
                switch (coordinate) {
                    case 'w':
                        if(relative) {
                            option.w += gameQuery.width;
                        }
                        gameQuery.width = option.w;
                        this.css("width","" + gameQuery.width + "px");
                        break;

                    case 'h':
                        if(relative) {
                            option.h += gameQuery.height;
                        }
                        gameQuery.height = option.h;
                        this.css("height","" + gameQuery.height + "px");
                        break;
                }
            }
            $.gameQuery.update(this, option);
            return this;
        }
    }); 

    $.extend({ gQ: $.gameQuery}); 
})(jQuery);
