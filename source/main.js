authorTools = null; // Global without 'var', following PT conventions

function AuthorTools() {
    this.menuItems = [];
}

// Initialize and add items directly to the Extensions menu
AuthorTools.prototype.init = function() {
    var menu = ipc.appWindow().getMenuBar().getExtensionsPopupMenu();

    this.menuItems.push(this.addMenuItem(menu, "✅ Align logical workspace items to grid", this.alignToGrid));
    this.menuItems.push(this.addMenuItem(menu, "✅ Enable portfast on all access ports", this.enablePortfast));
    this.menuItems.push(this.addMenuItem(menu, "✅ Write all configurations to NVRAM", this.writeAllConfigsToNvram));
    this.menuItems.push(this.addMenuItem(menu, "✅ Clear Command Log", this.clearCommandLog));
    this.menuItems.push(this.addMenuItem(menu, "✅ Export all startup configurations to files", this.exportAllConfigs));
};

// Helper function to add menu items and register click events
AuthorTools.prototype.addMenuItem = function(menu, label, callback) {
    var uuid = menu.insertItem("", label);
    var menuItem = menu.getMenuItemByUuid(uuid);
    if (menuItem) {
        menuItem.registerEvent("onClicked", this, callback);
    }
    return uuid; // Store UUID for future reference
};

// Cleanup method to remove menu items and unregister events
AuthorTools.prototype.cleanUp = function() {
    if (!this.menuItems.length) return; // Skip if no items exist

    var menu = ipc.appWindow().getMenuBar().getExtensionsPopupMenu();

    for (var i = 0; i < this.menuItems.length; i++) {
        var uuid = this.menuItems[i];
        if (uuid) {
            _ScriptModule.unregisterIpcEventByID("MenuItem", uuid, "onClicked", this, this.clearCommandLog);
            menu.removeItemUuid(uuid);
        }
    }

    this.menuItems = []; // Clear stored UUIDs
};


// Define functions for each menu item

AuthorTools.prototype.clearCommandLog = function() {
    console.log("Clearing command log...");
    ipc.commandLog().clear()
};

AuthorTools.prototype.writeAllConfigsToNvram = function() {
    console.log("Writing all configurations to NVRAM...");
    function saveAllConfigs() {
        var deviceCount = ipc.network().getDeviceCount();
    
        for (var i = 0; i < deviceCount; i++) {
            var device = ipc.network().getDeviceAt(i);
            
            var deviceType = device.getType()
            if (deviceType <= 1 || deviceType == 16) {
                if ( device.isBooting() ) { device.skipBoot(); }
                device.enterCommand("write memory", "enable");
                console.log("Saved configuration for " + device.getName());
            }
        }
    }
};

AuthorTools.prototype.exportAllConfigs = function() {
    console.log("Exporting all startup configurations...");
    var net = ipc.network();
    var devicecount = net.getDeviceCount();

    var devices = [];
    for (var i = 0; i < devicecount; i++) {
        var device = net.getDeviceAt(i);
        devices.push(device);
    }

    realFs = ipc.systemFileManager();

    dirPath = realFs.getSelectedDirectory("Location to save configuration files...", "");

    if (dirPath) {
        for (device of devices) {
            deviceType = device.getType();
            if (deviceType <= 1 || deviceType == 16) {
                deviceName = device.getName();
                deviceStartupConfig = device.getStartupFile();
                realFs.writePlainTextToFile(dirPath + "/" + deviceName + ".txt", deviceStartupConfig.join("\n"));
                console.log("Exported configuration for " + deviceName);
            }
        }
    } else {
        console.log("No directory selected, skipping export...");
    }
};

AuthorTools.prototype.enablePortfast = function() {
    console.log("Enabling portfast on all access ports...");

    var net = ipc.network();
    var devicecount = net.getDeviceCount();

    var devices = [];
    for (var i = 0; i < devicecount; i++) {
        var device = net.getDeviceAt(i);
        devices.push(device);
    }

    for (device of devices) {
        deviceType = device.getType();
        if (deviceType == 1 || deviceType == 16) {
            portCount = device.getPortCount()
            for (var i = 0; i < portCount; i++) {
                var port = device.getPortAt(i);
                if (port.isEthernetPort () && port.isAccessPort()) {
                    portName = port.getName();
                    device.enterCommand(`interface ${portName}`, "global");
                    device.enterCommand("spanning-tree portfast", "");

                    console.log("Enabled portfast on " + portName);
                }
            }
        }
    }
};

AuthorTools.prototype.alignToGrid = function() {
    console.log("Aligning devices, clusters, notes, and shapes to grid...");

    var deviceGridSize = 100;
    var clusterGridSize = 100;
    var noteGridSize = 15;
    var shapesGridSize = 50;

    // Align devices to grid

    var deviceCount = ipc.network().getDeviceCount();

    for (var i = 0; i < deviceCount; i++) {
        var device = ipc.network().getDeviceAt(i);

        var x = device.getCenterXCoordinate();
        var y = device.getCenterYCoordinate();

        x = Math.round(x / deviceGridSize) * deviceGridSize;
        y = Math.round(y / deviceGridSize) * deviceGridSize;

        device.moveToLocationCentered(x, y);
    }

    // Align clusters to grid

    var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
    var clusterCount = lw.getCurrentCluster().getChildClusterCount();

    for (var c = 0; c < clusterCount; c++) {
        var cluster = lw.getCurrentCluster().getChildClusterAt(c);

        var x = cluster.getCenterXCoordinate();
        var y = cluster.getCenterYCoordinate();

        x = Math.round(x / clusterGridSize) * clusterGridSize;
        y = Math.round(y / clusterGridSize) * clusterGridSize;

        cluster.moveToLocationCentered(x, y);
    }

    // Align shapes to grid

    var canvasItemIds = lw.getCanvasItemIds();

    for (var canvasItemId of canvasItemIds) {
        var x = lw.getCanvasItemX(canvasItemId);
        var y = lw.getCanvasItemY(canvasItemId);

        x = Math.round(x / shapesGridSize) * shapesGridSize;
        y = Math.round(y / shapesGridSize) * shapesGridSize;

        lw.setCanvasItemX(canvasItemId, x);
        lw.setCanvasItemY(canvasItemId, y);
    }

    // Align notes to grid

    var noteIds = lw.getCanvasNoteIds();

    for (var noteId of noteIds) {
        var x = lw.getCanvasItemRealX(noteId);
        var y = lw.getCanvasItemRealY(noteId);

        x = Math.round(x / noteGridSize) * noteGridSize;
        y = Math.round(y / noteGridSize) * noteGridSize;

        lw.setCanvasItemRealPos(noteId, x, y);
    }

}


// Initialize the extension
function main() {
    authorTools = new AuthorTools(); // No 'var' ensures it's globally accessible
    authorTools.init();
}

// Global cleanup function
function cleanUp() {
    if (authorTools) {
        authorTools.cleanUp();
        authorTools = null; // Ensure cleanup is complete
    }
}
