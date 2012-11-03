moduleAid.VERSION = '1.0.0';

this.browser = $('browser');

this.dragalt = null;
this.dragorix = null;
this.dragTarget = null;
this.dragNotTarget = null;
this.dragNewW = null;
this.dragOtherW = null;

// Drag (resize when renderabove) handlers
this.dragStart = function(e) {
	if(e.which != '1' || customizing) { return; }
	
	listenerAid.add(window, "mousemove", drag, false);
	listenerAid.add(window, "mouseup", dragEnd, false);
	
	dragalt = true;
	dragorix = e.screenX;
	if(e.target.id == 'omnisidebar_resizer' || e.target.id == 'sidebar-splitter') {
		dragTarget = {
			target: mainSidebar,
			dragoriw: mainSidebar.width
		};
		dragNotTarget = {
			target: twinSidebar,
			dragoriw: twinSidebar.width
		};
		if(!prefAid.moveSidebars) {
			dragalt = false;
		}
	} else {
		dragTarget = {
			target: twinSidebar,
			dragoriw: twinSidebar.width
		};
		dragNotTarget = {
			target: mainSidebar,
			dragoriw: mainSidebar.width
		};
		if(prefAid.moveSidebars) {
			dragalt = false;
		}
	}
	
	dragNewW = dragTarget.dragoriw;
	dragOtherW = dragNotTarget.dragoriw;
	
	dispatch(dragTarget.target.box, { type: 'startSidebarResize', cancelable: false, detail: { bar: dragTarget.target } });
};

this.dragEnd = function(e) {
	listenerAid.remove(window, "mousemove", drag, false);
	listenerAid.remove(window, "mouseup", dragEnd, false);
	
	dragTarget.target.box.setAttribute('width', dragNewW);
	dragTarget.target.box.style.width = '';
	if(dragOtherW) {
		dragNotTarget.target.box.setAttribute('width', dragOtherW);
		dragNotTarget.target.box.style.width = '';
	}
	
	// Don't need to wait for the timers to fire themselves, since we've finished resizing at this point
	// No weird jump of sidebar size back to the original size for a moment when renderabove is on.
	setAboveWidth();
	
	dispatch(dragTarget.target.box, { type: 'endSidebarResize', cancelable: false, detail: { bar: dragTarget.target } });
};

this.drag = function(e) {
	// Are we dragging from the right or the left
	if(dragalt) {
		dragNewW = dragTarget.dragoriw + (dragorix - e.screenX);
	} else {
		dragNewW = dragTarget.dragoriw + (e.screenX - dragorix);
	}
	if(dragNewW < prefAid.minSidebarWidth) { dragNewW = prefAid.minSidebarWidth; } // we so don't want this...
	else if(dragNewW > browser.clientWidth -prefAid.minSidebarWidth -prefAid.minSpaceBetweenSidebars) { dragNewW = browser.clientWidth -prefAid.minSidebarWidth -prefAid.minSpaceBetweenSidebars; } // or this
	
	// If new width makes it overlap the other sidebar...
	if(dragOtherW) {
		if(dragNewW > browser.clientWidth -dragNotTarget.dragoriw -prefAid.minSpaceBetweenSidebars) {
			dragOtherW = browser.clientWidth -prefAid.minSpaceBetweenSidebars -dragNewW;
		} else {
			dragOtherW = dragNotTarget.dragoriw;
		}
	}
	
	// Temporarily apply new widths
	dragTarget.target.box.setAttribute('width', dragNewW);
	if(dragTarget.target.above) {
		dragTarget.target.box.style.width = dragNewW +'px';
	}
	if(dragOtherW) {
		dragNotTarget.target.box.setAttribute('width', dragOtherW);
		if(dragNotTarget.target.above) {
			dragNotTarget.target.box.style.width = dragOtherW +'px';
		}
	}
};

this.browserResized = function(e) {
	browserMinWidth(); // this needs to be immediate, so the browser width never goes below these values
	
	// The listeners to this event aren't very heavy (so far at least), it doesn't slow down the resizing of the windows when I set the delay to 0.
	timerAid.init('browserResized', function() {
		dispatch(browser, { type: 'browserResized', cancelable: false });
	}, 0);
};

// this simulates the default browser behavior when the sidebars are docked
this.browserMinWidth = function() {
	var minWidth = prefAid.minSpaceBetweenSidebars;
	if(mainSidebar.width) { minWidth += mainSidebar.width; }
	if(twinSidebar.width) { minWidth += twinSidebar.width; }
	browser.style.minWidth = minWidth+'px';
};

this.setHeight = function() {
	var moveBy = $('main-window').getAttribute('sizemode') == 'normal' ? +1 : 0;
	// I can't set these by css, cpu usage goes through the roof?!
	if(mainSidebar.box) { mainSidebar.box.style.height = (prefAid.renderabove && !customizing) ? $('appcontent').clientHeight +moveBy +'px' : ''; }
	if(twinSidebar.box) { twinSidebar.box.style.height = (prefAid.renderaboveTwin && !customizing) ? $('appcontent').clientHeight +moveBy +'px' : ''; }
};

this.setAboveWidth = function() {
	// Unload current stylesheet if it's been loaded
	styleAid.unload('aboveWidthURI');
	
	// OSX Lion needs the sidebar to be moved one pixel or it will have a space between it and the margin of the window
	// I'm not supporting other versions of OSX, just this one isn't simple as it is
	var moveBy = (Services.appinfo.OS != 'WINNT') ? -1 : 0;
	
	var sscode = '/*OmniSidebar CSS declarations of variable values*/\n';
	sscode += '@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n';
	sscode += '@-moz-document url("chrome://browser/content/browser.xul") {\n';
	if(prefAid.renderabove && mainSidebar.width) {
		sscode += '	#sidebar-box[renderabove] { width: ' + mainSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box[renderabove]:not([movetoright]) { left: -' + mainSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box[renderabove][movetoright] { right: -' + mainSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box[renderabove]:not([renderabove="autohide"]):not([movetoright]) #omnisidebar_resizebox,\n';
		sscode += '	#sidebar-box[renderabove][customizing]:not([movetoright]) #omnisidebar_resizebox,\n';
		sscode += '	#sidebar-box[customizing]:not([movetoright]) #omnisidebar_resizebox { left: ' + (mainSidebar.width +moveBy) + 'px !important; }\n';
		sscode += '	#sidebar-box[renderabove]:not([renderabove="autohide"])[movetoright] #omnisidebar_resizebox,\n';
		sscode += '	#sidebar-box[renderabove][customizing][movetoright] #omnisidebar_resizebox,\n';
		sscode += '	#sidebar-box[customizing][movetoright] #omnisidebar_resizebox { right: ' + (mainSidebar.width +moveBy) + 'px !important; }\n';
	}
	
	if(prefAid.renderaboveTwin && twinSidebar.width) {
		sscode += '	#sidebar-box-twin[renderabove] { width: ' + twinSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box-twin[renderabove]:not([movetoleft]) { right: -' + twinSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box-twin[renderabove][movetoleft] { left: -' + twinSidebar.width + 'px; }\n';
		sscode += '	#sidebar-box-twin[renderabove]:not([renderabove="autohide"]):not([movetoleft]) #omnisidebar_resizebox-twin,\n';
		sscode += '	#sidebar-box-twin[renderabove][customizing]:not([movetoleft]) #omnisidebar_resizebox-twin,\n';
		sscode += '	#sidebar-box-twin[customizing]:not([movetoleft]) #omnisidebar_resizebox-twin { right: ' + (twinSidebar.width +moveBy) + 'px !important; }\n';
		sscode += '	#sidebar-box-twin[renderabove]:not([renderabove="autohide"])[movetoleft] #omnisidebar_resizebox-twin,\n';
		sscode += '	#sidebar-box-twin[renderabove][customizing][movetoleft] #omnisidebar_resizebox-twin,\n';
		sscode += '	#sidebar-box-twin[customizing][movetoleft] #omnisidebar_resizebox-twin { left: ' + (twinSidebar.width +moveBy) + 'px !important; }\n';
	}
	
	sscode += '}';
	
	styleAid.load('aboveWidthURI', sscode, true);
};

this.toggleAbove = function(twin) {
	if(customizing) { return; }
	
	if(twin) {
		prefAid.renderaboveTwin = !prefAid.renderaboveTwin;
	} else {
		prefAid.renderabove = !prefAid.renderabove;
	}
};

this.toggleDockers = function(noHeaders) {
	toggleAttribute(mainSidebar.box, 'nodock', prefAid.hideheaderdock);
	toggleAttribute(twinSidebar.box, 'nodock', prefAid.hideheaderdockTwin);
	
	if(!noHeaders) {
		toggleHeaders();
	}
};

this.toggleDockerStatus = function(bar) {
	toggleAttribute(bar.docker, 'sidebarDocked', bar.above);
	toggleAttribute(bar.docker, 'tooltiptext', bar.above, stringsAid.get('buttons', 'dockbutton'), stringsAid.get('buttons', 'undockbutton'));
};

this.toggleRenderAbove = function() {
	if(prefAid.renderabove) {
		overlayAid.overlayURI('chrome://'+objPathString+'/content/headers.xul', 'renderAbove', null, loadRenderAboveMain, loadRenderAboveMain);
	} else {
		overlayAid.removeOverlayURI('chrome://'+objPathString+'/content/headers.xul', 'renderAbove');
	}
	
	if(prefAid.renderaboveTwin) {
		overlayAid.overlayURI('chrome://'+objPathString+'/content/headersTwin.xul', 'renderAboveTwin', null, loadRenderAboveTwin, loadRenderAboveTwin);
	} else {
		overlayAid.removeOverlayURI('chrome://'+objPathString+'/content/headersTwin.xul', 'renderAboveTwin');
	}
};

this.loadRenderAboveMain = function(window) {
	if(window[objName] && window[objName].setAbove) { window[objName].setAbove(window[objName].mainSidebar); }
};

this.loadRenderAboveTwin = function(window) {
	if(window[objName] && window[objName].setAbove) { window[objName].setAbove(window[objName].twinSidebar); }
};

this.setAbove = function(bar) {
	toggleAttribute(bar.box, 'renderabove', bar.above, bar.undockMode);
	
	toggleDockerStatus(bar);
	
	setHeight();
	setAboveWidth();
	
	if(bar.above) {
		dispatch(bar.resizeBox, { type: 'sidebarAbove', cancelable: false });
		if(!UNLOADED && !bar.box.hidden) {
			fireSidebarFocusedEvent(bar.twin);
		}
	}
};

this.setUndockModeMain = function() {
	toggleAttribute(mainSidebar.box, 'renderabove', mainSidebar.above, mainSidebar.undockMode);
};

this.setUndockModeTwin = function() {
	toggleAttribute(twinSidebar.box, 'renderabove', twinSidebar.above, twinSidebar.undockMode);
};

moduleAid.LOADMODULE = function() {
	styleAid.load('aboveSheet', 'above');
	overlayAid.overlayURI("chrome://"+objPathString+"/content/headers.xul", 'renderAboveDocker', null,
		function() { window[objName].toggleDockerStatus(window[objName].mainSidebar); }
	);
	overlayAid.overlayURI("chrome://"+objPathString+"/content/headersTwin.xul", 'renderAboveDockerTwin', null,
		function() { window[objName].toggleDockerStatus(window[objName].twinSidebar); }
	);
	moduleAid.load('autohide');
	moduleAid.load('autoclose');
	
	listenerAid.add(window, 'sidebarWidthChanged', setAboveWidth);
	
	prefAid.listen('hideheaderdock', toggleDockers);
	prefAid.listen('hideheaderdockTwin', toggleDockers);
	prefAid.listen('renderabove', toggleRenderAbove);
	prefAid.listen('renderaboveTwin', toggleRenderAbove);
	prefAid.listen('undockMode', setUndockModeMain);
	prefAid.listen('undockModeTwin', setUndockModeTwin);
	
	toggleDockers(true);
	toggleRenderAbove();
	
	hideMainHeader.__defineGetter__('docker', function() { return prefAid.hideheaderdock; });
	hideTwinHeader.__defineGetter__('docker', function() { return prefAid.hideheaderdockTwin; });
	
	// can't let the browser be resized below the dimensions of the sidebars
	browserMinWidth();
	listenerAid.add(browser, 'resize', browserResized);
	listenerAid.add(browser, 'browserResized', setHeight);
};

moduleAid.UNLOADMODULE = function() {
	listenerAid.remove(browser, 'resize', browserResized);
	listenerAid.remove(browser, 'browserResized', setHeight);
	browser.style.minWidth = '';
	
	delete hideMainHeader.docker;
	delete hideTwinHeader.docker;
	
	removeAttribute(mainSidebar.box, 'renderabove');
	removeAttribute(twinSidebar.box, 'renderabove');
	
	listenerAid.remove(window, 'sidebarWidthChanged', setAboveWidth);
	
	prefAid.unlisten('hideheaderdock', toggleDockers);
	prefAid.unlisten('hideheaderdockTwin', toggleDockers);
	prefAid.unlisten('renderabove', toggleRenderAbove);
	prefAid.unlisten('renderaboveTwin', toggleRenderAbove);
	prefAid.unlisten('undockMode', setUndockModeMain);
	prefAid.unlisten('undockModeTwin', setUndockModeTwin);
	
	moduleAid.unload('autoclose');
	moduleAid.unload('autohide');
	if(UNLOADED) {
		styleAid.unload('aboveSheet');
		styleAid.unload('aboveWidthURI');
		overlayAid.removeOverlayURI('chrome://'+objPathString+'/content/headers.xul', 'renderAbove');
		overlayAid.removeOverlayURI('chrome://'+objPathString+'/content/headersTwin.xul', 'renderAboveTwin');
		overlayAid.removeOverlayURI("chrome://"+objPathString+"/content/headers.xul", 'renderAboveDocker');
		overlayAid.removeOverlayURI("chrome://"+objPathString+"/content/headersTwin.xul", 'renderAboveDockerTwin');
	}
};
