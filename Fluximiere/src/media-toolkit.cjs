// The upstream prebuilt browser bundle avoids an ESM initialization cycle between
// the Matroska reader and writer when CanvasSink and Output are bundled together.
module.exports = require('mediabunny');
