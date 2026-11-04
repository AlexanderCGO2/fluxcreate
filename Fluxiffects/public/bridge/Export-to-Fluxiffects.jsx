#target aftereffects
/* FluxMotion bridge v1. Export the open AE project with File > Scripts > Run Script File. */
(function () {
    // ES3 syntax and a private serializer keep this independent of host JSON support.
    var project;
    var assetById = {};
    function read(fn, fallback) {
        try { var value = fn(); return value === undefined ? fallback : value; }
        catch (error) { return fallback; }
    }
    function number(value, fallback) { return typeof value === "number" && isFinite(value) ? value : fallback; }
    function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
    function quote(value) {
        return '"' + String(value).replace(/[\\"\x00-\x1f\u2028\u2029]/g, function (character) {
            var escapes = { '"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };
            if (own(escapes, character)) { return escapes[character]; }
            return "\\u" + ("0000" + character.charCodeAt(0).toString(16)).slice(-4);
        }) + '"';
    }
    function json(value) {
        var parts = [], index, key;
        if (value === null || value === undefined) { return "null"; }
        if (typeof value === "string") { return quote(value); }
        if (typeof value === "number") { return isFinite(value) ? String(value) : "null"; }
        if (typeof value === "boolean") { return value ? "true" : "false"; }
        if (value instanceof Array) {
            for (index = 0; index < value.length; index += 1) { parts.push(json(value[index])); }
            return "[" + parts.join(",") + "]";
        }
        for (key in value) {
            if (own(value, key) && typeof value[key] !== "function" && value[key] !== undefined) {
                parts.push(quote(key) + ":" + json(value[key]));
            }
        }
        return "{" + parts.join(",") + "}";
    }
    function color(rgb, fallback) {
        if (!rgb || rgb.length < 3) { return fallback; }
        var result = "#", index, channel;
        for (index = 0; index < 3; index += 1) {
            channel = Math.round(Math.max(0, Math.min(1, number(rgb[index], 0))) * 255);
            result += ("0" + channel.toString(16)).slice(-2);
        }
        return result;
    }
    function itemId(item) { return "ae-item-" + String(item.id); }
    function layerId(layer, comp) { return itemId(comp) + "-layer-" + read(function () { return layer.id; }, layer.index); }
    function warning(layer, message) {
        layer.warnings.push(message);
        project.warnings.push(layer.aeMetadata.compositionName + " / " + layer.name + ": " + message);
    }
    function property(group, matchName) { return read(function () { return group.property(matchName); }, null); }
    function rawValue(prop) {
        // Do not evaluate imported expression source; retain the pre-expression value.
        return read(function () { return prop.valueAtTime(0, true); }, null);
    }
    function simpleValue(value) {
        var output, index;
        if (value === null || value === undefined) { return null; }
        if (typeof value === "number") { return number(value, null); }
        if (typeof value === "string" || typeof value === "boolean") { return value; }
        if (value instanceof Array) {
            output = [];
            for (index = 0; index < value.length; index += 1) { output.push(simpleValue(value[index])); }
            return output;
        }
        if (read(function () { return typeof value.text === "string"; }, false)) {
            return { text: value.text, font: read(function () { return value.font; }, ""),
                fontSize: read(function () { return value.fontSize; }, null),
                fillColor: simpleValue(read(function () { return value.fillColor; }, null)) };
        }
        if (read(function () { return value.vertices instanceof Array; }, false)) {
            return { vertices: simpleValue(value.vertices), inTangents: simpleValue(value.inTangents),
                outTangents: simpleValue(value.outTangents), closed: value.closed };
        }
        return null;
    }
    function interpolation(value) {
        if (value === KeyframeInterpolationType.HOLD) { return "hold"; }
        if (value === KeyframeInterpolationType.BEZIER) { return "bezier"; }
        return "linear";
    }
    function easeData(eases) {
        var output = [], index;
        if (!eases) { return output; }
        for (index = 0; index < eases.length; index += 1) {
            output.push({ speed: number(eases[index].speed, 0), influence: number(eases[index].influence, 0) });
        }
        return output;
    }
    function propertyMetadata(prop, depth) {
        if (!prop || depth > 8) { return null; }
        var result = { name: prop.name, matchName: prop.matchName }, index, child, key;
        if (prop.propertyType !== PropertyType.PROPERTY) {
            result.properties = [];
            for (index = 1; index <= prop.numProperties; index += 1) {
                child = propertyMetadata(prop.property(index), depth + 1);
                if (child) { result.properties.push(child); }
            }
            return result;
        }
        result.value = simpleValue(rawValue(prop));
        result.keys = [];
        for (index = 1; index <= prop.numKeys; index += 1) {
            key = { time: prop.keyTime(index), value: simpleValue(prop.keyValue(index)),
                inInterpolation: read(function () { return interpolation(prop.keyInInterpolationType(index)); }, "linear"),
                outInterpolation: read(function () { return interpolation(prop.keyOutInterpolationType(index)); }, "linear"),
                inEase: read(function () { return easeData(prop.keyInTemporalEase(index)); }, []),
                outEase: read(function () { return easeData(prop.keyOutTemporalEase(index)); }, []) };
            if (read(function () { return prop.isSpatial; }, false)) {
                key.inSpatialTangent = read(function () { return simpleValue(prop.keyInSpatialTangent(index)); }, null);
                key.outSpatialTangent = read(function () { return simpleValue(prop.keyOutSpatialTangent(index)); }, null);
            }
            result.keys.push(key);
        }
        if (read(function () { return prop.expressionEnabled; }, false)) {
            result.expression = read(function () { return prop.expression; }, "");
            result.expressionEnabled = true;
        }
        return result;
    }
    function segmentEasing(prop, index) {
        var outgoing = read(function () { return interpolation(prop.keyOutInterpolationType(index)); }, "linear");
        if (outgoing === "hold") { return "hold"; }
        var incoming = index < prop.numKeys ? read(function () {
            return interpolation(prop.keyInInterpolationType(index + 1));
        }, "linear") : "linear";
        if (outgoing === "bezier" && incoming === "bezier") { return "ease-in-out"; }
        if (outgoing === "bezier") { return "ease-in"; }
        if (incoming === "bezier") { return "ease-out"; }
        return "linear";
    }
    function exportChannel(layer, name, prop, component, factor, offset) {
        if (!prop) { return; }
        var value = rawValue(prop), keys = [], index, source, eased = false;
        function scalar(input) {
            var result = component === null ? input : input && input[component];
            return typeof result === "number" && isFinite(result) ? result * factor + offset : layer[name];
        }
        layer[name] = scalar(value);
        for (index = 1; index <= prop.numKeys; index += 1) {
            source = prop.keyValue(index);
            var easing = segmentEasing(prop, index);
            if (easing !== "linear" && easing !== "hold") { eased = true; }
            keys.push({ id: layer.id + "-" + name + "-" + index, time: prop.keyTime(index), value: scalar(source), easing: easing });
        }
        if (keys.length) { layer.keyframes[name] = keys; }
        if (eased && !layer.aeMetadata.easingWarning) {
            warning(layer, "Custom Bezier timing is approximated with easing presets. Original temporal handles are retained in aeMetadata.");
            layer.aeMetadata.easingWarning = true;
        }
    }
    function exportTransforms(source, layer) {
        var group = property(source, "ADBE Transform Group");
        if (!group) { return; }
        var position = property(group, "ADBE Position");
        var anchor = property(group, "ADBE Anchor Point");
        var scale = property(group, "ADBE Scale");
        var rotation = property(group, "ADBE Rotate Z");
        var opacity = property(group, "ADBE Opacity");
        var parentBounds = layer.aeMetadata.parentBounds;
        var positionOffsetX = parentBounds ? -parentBounds.left : 0;
        var positionOffsetY = parentBounds ? -parentBounds.top : 0;
        layer.aeMetadata.transform = propertyMetadata(group, 0);
        if (position && read(function () { return position.dimensionsSeparated; }, false)) {
            exportChannel(layer, "x", read(function () { return position.getSeparationFollower(0); }, null), null, 1, positionOffsetX);
            exportChannel(layer, "y", read(function () { return position.getSeparationFollower(1); }, null), null, 1, positionOffsetY);
        } else {
            exportChannel(layer, "x", position, 0, 1, positionOffsetX);
            exportChannel(layer, "y", position, 1, 1, positionOffsetY);
            if (position && position.numKeys > 1 && read(function () { return position.isSpatial; }, false)) {
                var curved = false, index, tangent, axis;
                for (index = 1; index <= position.numKeys; index += 1) {
                    tangent = read(function () { return position.keyOutSpatialTangent(index); }, []);
                    for (axis = 0; axis < tangent.length; axis += 1) { if (Math.abs(tangent[axis]) > 0.0001) { curved = true; } }
                    tangent = read(function () { return position.keyInSpatialTangent(index); }, []);
                    for (axis = 0; axis < tangent.length; axis += 1) { if (Math.abs(tangent[axis]) > 0.0001) { curved = true; } }
                }
                if (curved) { warning(layer, "Curved spatial motion is approximated with straight segments between keyframes; original tangents are retained."); }
            }
        }
        exportChannel(layer, "anchorX", anchor, 0, 1, -layer.aeMetadata.bounds.left);
        exportChannel(layer, "anchorY", anchor, 1, 1, -layer.aeMetadata.bounds.top);
        exportChannel(layer, "scaleX", scale, 0, 0.01, 0);
        exportChannel(layer, "scaleY", scale, 1, 0.01, 0);
        exportChannel(layer, "rotation", rotation, null, 1, 0);
        exportChannel(layer, "opacity", opacity, null, 0.01, 0);
        function expressions(node) {
            if (!node) { return false; }
            if (node.expressionEnabled) { return true; }
            var children = node.properties || [], childIndex;
            for (childIndex = 0; childIndex < children.length; childIndex += 1) { if (expressions(children[childIndex])) { return true; } }
            return false;
        }
        if (expressions(layer.aeMetadata.transform)) {
            warning(layer, "Transform expressions are retained as text only. Editable values and keys use the underlying pre-expression animation.");
        }
    }
    function mediaType(item) {
        if (!item.hasVideo && item.hasAudio) { return "audio"; }
        if (read(function () { return item.mainSource.isStill; }, false)) { return "image"; }
        return "video";
    }
    function addAsset(item) {
        var id = itemId(item);
        if (assetById[id]) { return assetById[id]; }
        var file = read(function () { return item.file; }, null);
        var path = file ? file.fsName : read(function () { return item.mainSource.missingFootagePath; }, "");
        var asset = { id: id, name: item.name, type: mediaType(item), path: path,
            width: item.width, height: item.height, duration: item.duration,
            missing: read(function () { return item.footageMissing; }, false),
            aeMetadata: { frameRate: item.frameRate, pixelAspect: item.pixelAspect, hasAudio: item.hasAudio } };
        assetById[id] = asset;
        project.assets.push(asset);
        return asset;
    }
    function exportText(source, layer) {
        var textGroup = property(source, "ADBE Text Properties");
        var textProperty = property(textGroup, "ADBE Text Document");
        var document = rawValue(textProperty);
        if (!document) { warning(layer, "Source text could not be read."); return; }
        layer.type = "text";
        layer.text = document.text;
        layer.fontFamily = read(function () { return document.fontFamily; }, read(function () { return document.font; }, "Arial"));
        layer.fontSize = read(function () { return document.fontSize; }, 48);
        var fontStyle = read(function () { return document.fontStyle; }, "");
        layer.fontWeight = /bold|black|heavy/i.test(fontStyle) || read(function () { return document.fauxBold; }, false) ? 700 : 400;
        layer.fill = read(function () { return document.applyFill ? color(document.fillColor, "#ffffff") : "transparent"; }, "#ffffff");
        layer.stroke = read(function () { return document.applyStroke ? color(document.strokeColor, "#000000") : "transparent"; }, "transparent");
        layer.strokeWidth = read(function () { return document.applyStroke ? document.strokeWidth : 0; }, 0);
        layer.letterSpacing = read(function () { return document.tracking; }, 0) * layer.fontSize / 1000;
        var justification = read(function () { return document.justification; }, null);
        layer.textAlign = justification === ParagraphJustification.CENTER_JUSTIFY ? "center" :
            justification === ParagraphJustification.RIGHT_JUSTIFY ? "right" : "left";
        layer.aeMetadata.sourceText = propertyMetadata(textProperty, 0);
        layer.aeMetadata.fontPostScriptName = read(function () { return document.font; }, "");
        layer.aeMetadata.fontStyle = fontStyle;
        if (textProperty.numKeys || read(function () { return textProperty.expressionEnabled; }, false)) {
            warning(layer, "Animated source text is imported at time zero; source text keys and expression text are retained as metadata.");
        }
        var animators = property(textGroup, "ADBE Text Animators");
        if (animators && animators.numProperties) {
            layer.aeMetadata.textAnimators = propertyMetadata(animators, 0);
            warning(layer, "Text animators are retained as metadata and are not rendered.");
        }
        warning(layer, "Text uses a single font style. Confirm font availability, paragraph layout, and glyph placement in FluxMotion.");
    }
    function blendMode(source, layer) {
        var mode = read(function () { return source.blendingMode; }, null);
        if (mode === null || mode === BlendingMode.NORMAL) { return "normal"; }
        layer.aeMetadata.blendingMode = String(mode);
        if (mode === BlendingMode.MULTIPLY) { return "multiply"; }
        if (mode === BlendingMode.SCREEN) { return "screen"; }
        if (mode === BlendingMode.OVERLAY) { return "overlay"; }
        warning(layer, "This AE blending mode is not mapped; the layer uses normal blending.");
        return "normal";
    }
    function exportLayer(source, comp, soloActive) {
        var bounds = { left: 0, top: 0, width: read(function () { return source.width; }, 100), height: read(function () { return source.height; }, 100) };
        if (source instanceof TextLayer || source instanceof ShapeLayer) {
            bounds = read(function () { return source.sourceRectAtTime(0, false); }, bounds);
        }
        var layer = { id: layerId(source, comp), name: source.name, type: "null",
            visible: source.enabled && (!soloActive || source.solo), locked: source.locked,
            start: source.inPoint, end: source.outPoint, x: 0, y: 0,
            width: Math.max(1, number(bounds.width, 100)), height: Math.max(1, number(bounds.height, 100)),
            anchorX: 0, anchorY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1,
            fill: "#ffffff", stroke: "transparent", strokeWidth: 0, cornerRadius: 0,
            text: "", fontFamily: "Arial", fontSize: 48, fontWeight: 400, textAlign: "left", letterSpacing: 0,
            assetId: null, parentId: source.parent ? layerId(source.parent, comp) : null,
            blendMode: "normal", effects: [], keyframes: {}, warnings: [],
            aeMetadata: { index: source.index, compositionName: comp.name, bounds: { left: bounds.left, top: bounds.top },
                startTime: source.startTime, stretch: source.stretch,
                solo: source.solo, audioEnabled: read(function () { return source.audioEnabled; }, false) } };
        if (source.parent && (source.parent instanceof TextLayer || source.parent instanceof ShapeLayer)) {
            var parentBounds = read(function () { return source.parent.sourceRectAtTime(0, false); }, {left: 0, top: 0});
            layer.aeMetadata.parentBounds = {left: parentBounds.left, top: parentBounds.top};
        }
        var footage = read(function () { return source.source; }, null);
        if (read(function () { return source.nullLayer; }, false)) {
            layer.type = "null";
        } else if (source instanceof TextLayer) {
            exportText(source, layer);
        } else if (source instanceof ShapeLayer) {
            layer.aeMetadata.contents = propertyMetadata(property(source, "ADBE Root Vectors Group"), 0);
            warning(layer, "Shape contents are preserved as metadata in a null placeholder. Rebuild the shape or import a rendered image/video.");
        } else if (footage instanceof CompItem) {
            layer.aeMetadata.sourceCompositionId = itemId(footage);
            warning(layer, "Nested composition retained as a null placeholder. The source composition is exported separately; nesting is not rendered.");
        } else if (footage instanceof FootageItem) {
            if (footage.mainSource instanceof SolidSource) {
                layer.type = "solid";
                layer.fill = color(footage.mainSource.color, "#ffffff");
            } else {
                var asset = addAsset(footage);
                layer.type = asset.type;
                layer.assetId = asset.id;
                layer.muted = !read(function () { return source.audioEnabled; }, false);
                warning(layer, "Relink the original media file in FluxMotion; media bytes are not embedded in this export.");
                if (asset.missing) { warning(layer, "The media is also offline in After Effects."); }
                if (layer.type !== "image") {
                    var rate = 100 / source.stretch;
                    var sourceIn = (source.inPoint - source.startTime) * rate;
                    if (rate >= 0.1 && rate <= 16 && sourceIn >= 0 && sourceIn <= 86400) {
                        layer.playbackRate = rate;
                        layer.sourceIn = sourceIn;
                    } else {
                        warning(layer, "Reverse media or unsupported source timing needs adjustment after import; original timing is retained in aeMetadata.");
                    }
                    var audioGroup = property(source, "ADBE Audio Group");
                    if (audioGroup) { layer.aeMetadata.audio = propertyMetadata(audioGroup, 0); }
                    if (asset.aeMetadata.hasAudio) { warning(layer, "AE audio levels and audio effects need review; audioEnabled is mapped to the layer's mute setting."); }
                }
            }
        } else {
            warning(layer, "Unsupported layer type retained as a null placeholder (for example, a camera or light).");
        }
        exportTransforms(source, layer);
        layer.blendMode = blendMode(source, layer);
        var effects = property(source, "ADBE Effect Parade");
        if (effects && effects.numProperties) {
            layer.aeMetadata.effects = propertyMetadata(effects, 0);
            warning(layer, "AE effects and plug-in parameters are retained as metadata. Apply equivalent FluxMotion effects manually.");
        }
        var masks = property(source, "ADBE Mask Parade");
        if (masks && masks.numProperties) {
            layer.aeMetadata.masks = propertyMetadata(masks, 0);
            warning(layer, "Masks are retained as metadata and are not rendered.");
        }
        if (read(function () { return source.threeDLayer; }, false)) {
            warning(layer, "3D transforms are reduced to X/Y, scale and Z rotation. Camera perspective, depth and lights are not rendered.");
        }
        if (read(function () { return source.adjustmentLayer; }, false)) {
            layer.type = "null";
            warning(layer, "Adjustment layer retained as a null placeholder; adjustment effects are not rendered.");
        }
        if (read(function () { return source.hasTrackMatte; }, false)) {
            warning(layer, "Track mattes are not applied; inspect the imported layer's visibility.");
        }
        if (read(function () { return source.timeRemapEnabled; }, false)) {
            layer.aeMetadata.timeRemap = propertyMetadata(property(source, "ADBE Time Remapping"), 0);
            warning(layer, "Time remapping is retained as metadata and is not rendered.");
        }
        if (read(function () { return source.motionBlur; }, false)) { warning(layer, "AE motion blur is not rendered."); }
        return layer;
    }
    function exportComp(comp) {
        var result = { id: itemId(comp), name: comp.name, width: comp.width, height: comp.height,
            fps: comp.frameRate, duration: comp.duration, background: color(comp.bgColor, "#000000"), layers: [],
            aeMetadata: { pixelAspect: comp.pixelAspect, displayStartTime: comp.displayStartTime,
                workAreaStart: comp.workAreaStart, workAreaDuration: comp.workAreaDuration } };
        var index, soloActive = false;
        for (index = 1; index <= comp.numLayers; index += 1) { if (comp.layer(index).solo) { soloActive = true; } }
        // Index 1 is the topmost layer. The importer must preserve this order.
        for (index = 1; index <= comp.numLayers; index += 1) { result.layers.push(exportLayer(comp.layer(index), comp, soloActive)); }
        if (comp.pixelAspect !== 1) { project.warnings.push(comp.name + ": non-square pixels are imported as square pixels."); }
        return result;
    }
    if (!app.project || !app.project.numItems) { alert("Open an After Effects project containing a composition first."); return; }
    try {
        project = { format: "fluxiffects-ae", version: 1,
            name: app.project.file ? app.project.file.displayName.replace(/\.(aep|aepx)$/i, "") : "After Effects project",
            compositions: [], assets: [], warnings: [],
            aeMetadata: { application: "Adobe After Effects", version: app.version,
                projectPath: app.project.file ? app.project.file.fsName : null,
                notes: "Schema 1. All times are seconds. Layer order is topmost first. Local media must be relinked." } };
        var index, item;
        for (index = 1; index <= app.project.numItems; index += 1) {
            item = app.project.item(index);
            if (item instanceof CompItem) { project.compositions.push(exportComp(item)); }
        }
        if (!project.compositions.length) { alert("This project has no compositions to export."); return; }
        var file = File.saveDialog("Export editable project to FluxMotion", "JSON files:*.json");
        if (!file) { return; }
        if (!/\.json$/i.test(file.name)) { file = new File(file.fsName + ".fluxiffects.json"); }
        file.encoding = "UTF-8";
        if (!file.open("w")) {
            throw new Error("Cannot write the selected file. Enable Allow Scripts to Write Files and Access Network in AE's Scripting & Expressions preferences, then choose a writable folder.");
        }
        try { if (!file.write(json(project))) { throw new Error("The project file could not be written: " + file.error); } }
        finally { file.close(); }
        alert("Exported " + project.compositions.length + " composition(s) to:\n" + file.fsName +
            "\n\nImport this JSON file in FluxMotion." +
            (project.warnings.length ? "\n" + project.warnings.length + " compatibility notes are included in the import report." : ""));
    } catch (error) {
        alert("FluxMotion export failed:\n" + error.toString() + "\nLine: " + read(function () { return error.line; }, "unknown"));
    }
}());
