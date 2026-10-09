export interface SimulationController {
 readonly backend:'CPU'|'GPU';
 time:number;
 error:string;
 stepMs:number;
 request(time:number):void;
 ready(time:number):Promise<void>;
 dispose():void;
}
