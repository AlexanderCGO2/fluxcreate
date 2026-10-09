import handler from '../FluxCreate/server/hosted-bundle.mjs';
import {dispatchURL} from '../FluxCreate/server/dispatch-url.mjs';
export default function(req,res){req.url=dispatchURL(req.url);return handler(req,res);}
