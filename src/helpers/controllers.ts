import { Group, WebGLRenderer, Scene, Camera, Vector3 } from "three";
import { CanvasUI } from "./canvas-ui";
import { EventType } from "./event-type";
import { ControllerEventHandler } from "./ControllerEventHandler";

export class Controllers {
    private hand1?: Group;
    private hand2?: Group;
    private leftJoints: any;
    private rightJoints: any;
    private rightIndex: any;
    private ui: CanvasUI;

    constructor(private renderer: WebGLRenderer, private scene: Scene, private evtHandler: ControllerEventHandler,
        private controller1: Group, private controller2: Group, private camera: Camera) {

        // Hand 1
        this.hand1 = this.renderer.xr.getHand(0);
        this.scene.add(this.hand1);

        // Hand 2
        this.hand2 = this.renderer.xr.getHand(1);
        this.scene.add(this.hand2);

        // handle controller/hand events
        this.handleControllerEvents(this.controller1, this.hand1!);
        this.handleControllerEvents(this.controller2, this.hand2!);

        const uiConfig = {
            panelSize: { width: 0.250, height: 0.125},
            width: 256,
            height: 128,
            opacity: 0.7,
            info: { type: "text", position:{ left: 6, top: 6 }, width: 244, height: 58, backgroundColor: "#aaa", fontColor: "#000", fontSize: 20 },
            pause: { type: "button", position:{ top: 70, left: 6 }, width: 40, height: 52, backgroundColor: "#bbb", fontColor: "#bb0", hover: "#fff", onSelect: () => this.evtHandler(EventType.pause)},
            play: { type: "button", position:{ top: 70, left: 60 }, width: 40, height: 52, backgroundColor: "#bbb", fontColor: "#bb0", hover: "#fff", onSelect: () => this.evtHandler(EventType.play) },
            stop: { type: "button", position:{ top: 70, left: 114 }, width: 40, height: 52, backgroundColor: "#bbb", fontColor: "#bb0", hover: "#fff", onSelect: () => this.evtHandler(EventType.exit) },
            renderer: this.renderer
        };
        
        const uiContent = {
            info: 'loading',
            pause: '<path>M 17 10 L 7 10 L 7 40 L 17 40 Z M 32 10 L 22 10 L 22 40 L 32 40 Z</path>',
            stop: '<path>M 7 10 L 32 10 L 32 40 L 7 40 Z</path>',
            play: '<path>M 32 25 L 12 10 L 12 40 Z</path>'
        };
        this.ui = new CanvasUI(uiContent, uiConfig);
        this.ui.mesh.visible = false;

        this.scene.add(this.ui.mesh);
    }

    public updateInfoText(text: string) {
        this.ui.updateElement('info', text);
        console.log('**** Updating player info text:', text);
    }

    public update = () => {
        if (!this.renderer.xr.isPresenting) return;

        if (this.leftJoints) {
            const leftPinky = this.leftJoints['pinky-finger-tip'];
            const leftThumb = this.leftJoints['thumb-tip'];

            if (!leftPinky || !leftThumb) {
                return;
            }

            this.ui.mesh.visible = leftPinky.position.x - leftThumb.position.x > leftThumb.position.distanceTo(leftPinky.position) * 2 / 3;
            const ui = this.ui.mesh;

            let pp = new Vector3(leftPinky.position.x, leftPinky.position.y, leftPinky.position.z);
            let tp = new Vector3(leftThumb.position.x, leftThumb.position.y, leftThumb.position.z);
            ui.visible = pp.x - tp.x > leftThumb.position.distanceTo(leftPinky.position) * 2 / 3;
            ui.rotation.y = Math.atan2( ( this.camera.position.x - ui.position.x ), ( this.camera.position.z - ui.position.z ) );

            if (this.ui.mesh.visible) {
                const np = leftPinky.position.project(this.camera).add(new Vector3(0.3, 0, 0)).unproject(this.camera);
                this.ui.mesh.position.set(np.x, np.y, np.z);
            }
        }

        if (this.rightJoints && !this.rightIndex) {
            const rightIndexTip = this.rightJoints['index-finger-tip'];
            const rightIndexPhalanxDistal = this.rightJoints['index-finger-phalanx-distal'];
            this.rightIndex = {tip: rightIndexTip, phalanx: rightIndexPhalanxDistal};
            this.ui?.setRightIndex(this.rightIndex);
        }

        if (this.ui.mesh.visible) {
            this.ui.update();
        }
    }

    private handleControllerEvents(controller: Group, hand: Group) {
        controller.addEventListener('connected', (event: any) => {
            if (event.data.handedness === 'left') {
                // console.log('**** left hand detected');
                this.leftJoints = (hand as any).joints;
            }
            if (event.data.handedness === 'right') {
                // console.log('**** right hand detected');
                this.rightJoints = (hand as any).joints;
            }
        });
    }
}
