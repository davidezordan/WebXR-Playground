import { WebGLRenderer } from "three";

export class AnchorsManager {
    constructor(private renderer: WebGLRenderer) {
        this.subscribeToEvents();
    }

    private subscribeToEvents() {
        this.renderer.xr.addEventListener( 'anchoradded', this.anchorAdded);
        this.renderer.xr.addEventListener( 'anchorremoved', this.anchorRemoved);
    }

    private unsubscribeFromEvents() {
        this.renderer.xr.removeEventListener( 'anchoradded', this.anchorAdded);
        this.renderer.xr.removeEventListener( 'anchorremoved', this.anchorRemoved);
    }

    private anchorAdded = () => {
    };

    private anchorRemoved = () => {
    };

    public destroy() {
        this.unsubscribeFromEvents();
    }
 }