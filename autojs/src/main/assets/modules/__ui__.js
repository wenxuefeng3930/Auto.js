module.exports = function(__runtime__, scope){
    var ui = {};
    ui.__view_cache__ = {};

    ui.layout = function(xml){
        var view = __runtime__.ui.layoutInflater.inflate(activity, xml.toString());
        ui.setContentView(view);
    }

    ui.setContentView = function(view){
        ui.view = view;
        ui.__view_cache__ = {};
        ui.run(function(){
            activity.setContentView(view);
        });
    }

    ui.findById = function(id){
        if(!ui.view)
            return null;
        var v = ui.findByStringId(ui.view.getChildAt(0), id);
        if(v){
            v = decorate(v);
        }
        return v;
    }

    ui.isUiThread = function(){
        importClass(android.os.Looper);
        return Looper.myLooper() == Looper.getMainLooper();
    }

    ui.run = function(action){
        if(ui.isUiThread()){
            return action();
        }
        var err = null;
        var result;
        var disposable = scope.threads.disposable();
        __runtime__.uiHandler.post(function(){
            try{
                result = action();
                disposable.setAndNotify(true);
            }catch(e){
                err = e;
                disposable.setAndNotify(true);
            }
        });
        disposable.blockedGet();
        if(err){
            throw err;
        }
        return result;
    }

    ui.post = function(action, delay){
        delay = delay || 0;
        __runtime__.getUiHandler().postDelay(wrapUiAction(action), delay);
    }

    ui.statusBarColor = function(color){
        if(typeof(color) == 'string'){
            color = android.graphics.Color.parseColor(color);
        }
        if(android.os.Build.VERSION.SDK_INT >= 21){
            ui.run(function(){
                activity.getWindow().setStatusBarColor(color);
            });
        }
    }

    ui.finish = function(){
        ui.run(function(){
            activity.finish();
        });
    }

    ui.findByStringId = function(view, id){
        return com.stardust.autojs.core.ui.JsViewHelper.findViewByStringId(view, id);
    }

    function decorate(view){
        var view = scope.events.__asEmitter__(Object.create(view));
        var gestureDetector = new android.view.GestureDetector(context, {
            onDown: function(e){
                e = wrapMotionEvent(e);
                scope.__exitIfError__(function(){
                    view.emit("touch_down", e, view);
                });
                return e.consumed;
            },
            onShowPress: function(e){
                e = wrapMotionEvent(e);
                view.emit("show_press", e, view);
            },
            onSingleTapUp: function(e){
               e = wrapMotionEvent(e);
               scope.__exitIfError__(function(){
                    view.emit("single_tap", e, view);
               });
               return e.consumed;
            },
            onScroll: function(e1, e2, distanceX, distanceY){
                 e1 = wrapMotionEvent(e1);
                 e2 = wrapMotionEvent(e2);
                 scope.__exitIfError__(function(){
                    view.emit("scroll", e1, e2, distanceX, distanceY, view);
                 });
                 return e1.consumed || e2.consumed;
            },
            onLongPress: function(e){
                 e = wrapMotionEvent(e);
                 view.emit("long_press", e, view);
            },
            onFling: function(e1, e2, velocityX, velocityY){
                 e1 = wrapMotionEvent(e1);
                 e2 = wrapMotionEvent(e2);
                 scope.__exitIfError__(function(){
                    view.emit("fling", e1, e2, velocityX, velocityY, view);
                 });
                 return e1.consumed || e2.consumed;
            }
        });
        view.setOnTouchListener(function(v, event){
            event = wrapMotionEvent(event);
            event.consumed = false;
            scope.__exitIfError__(function(){
               view.emit("touch", event, view);
            });
            return event.consumed;
        })
        view.setOnLongClickListener(function(v){
            var event = {};
            event.consumed = false;
            scope.__exitIfError__(function(){
               view.emit("long_click", event, view);
            });
            return event.consumed;
        });
        view.setOnClickListener(function(v){
            view.emit("click", view);
        });
        if(typeof(view.setOnCheckedChangeListener) == 'function'){
            view.setOnCheckedChangeListener(function(v, isChecked){
                view.emit("check", isChecked, view);
            });
        }
        view._id = function(id){
            return ui.findByStringId(view, id);
        }
        view.click = function(listener){
            if(listener){
                view.setOnClickListener(new android.view.View.OnClickListener(wrapUiAction(listener)));
            }else{
                view.performClick();
            }
        }
        view.longClick = function(listener){
            if(listener){
                view.setOnLongClickListener(wrapUiAction(listener, false));
            }else{
                view.performLongClick();
            }
        }
        return view;
    }

    ui.__decorate__ = decorate;

    function wrapUiAction(action, defReturnValue){
        if(typeof(activity)  != 'undefined'){
            return function(){return action();};
        }
        return function(){
            return __exitIfError__(action, defReturnValue);
        }
    }

    function wrapMotionEvent(e){
        e = Object.create(e);
        e.consumed = false;
        return e;
    }

    var proxy = __runtime__.ui;
    proxy.__proxy__ = {
        set: function(name, value){
            ui[name] = value;
        },
        get: function(name) {
           if(!ui[name] && ui.view){
               var cacheView = ui.__view_cache__[name];
               if(cacheView){
                   return cacheView;
               }
               cacheView = ui.findById(name);
               if(cacheView){
                   ui.__view_cache__[name] = cacheView;
                   return cacheView;
               }
           }
           return ui[name];
        }
    };


    return proxy;
}