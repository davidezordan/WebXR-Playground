import { WebGLRenderer } from "three";

export class PlanesManager {
    private planesAdded = new Set();

    constructor(private renderer: WebGLRenderer) {
        this.renderer.xr.addEventListener( 'planeadded', this.planeAdded);

        this.renderer.xr.addEventListener( 'planeremoved', this.planeRemoved);

        this.renderer.xr.addEventListener( 'planechanged', this.planeChanged);

        this.renderer.xr.addEventListener( 'planesdetected', this.planesDetected );
    }

    private planeAdded = (e) => {
        // console.log( "plane added", e.data )
    };

    private planeRemoved = (e) => {
        // console.log( "plane removed", e.data )
    };

    private planeChanged = (e) => {
        // console.log( "plane changed", e.data )
    };

    private planesDetected = (e) => {
        const detectedPlanes = e.data;
        const referenceSpace = this.renderer.xr.getReferenceSpace();

        // console.log( `Detected ${detectedPlanes.size} planes` );

        // @ts-ignore
        detectedPlanes.forEach((plane) => {

            if ( this.planesAdded.has( plane ) ) return;

            this.planesAdded.add( plane );

            const frame = (this.renderer.xr as any).getFrame();
            const planePose = frame.getPose( plane.planeSpace, referenceSpace );
            const polygon = plane.polygon;

            let minX = Number.MAX_SAFE_INTEGER;
            let maxX = Number.MIN_SAFE_INTEGER;
            let minZ = Number.MAX_SAFE_INTEGER;
            let maxZ = Number.MIN_SAFE_INTEGER;

            polygon.forEach( (point: { x: number; z: number; }) => {

                minX = Math.min( minX, point.x );
                maxX = Math.max( maxX, point.x );
                minZ = Math.min( minZ, point.z );
                maxZ = Math.max( maxZ, point.z );

            } );

            // const width = maxX - minX;
            // const height = maxZ - minZ;

            // const boxMesh = new THREE.Mesh(
            //     new THREE.BoxGeometry( width, 0.01, height ),
            //     new THREE.MeshBasicMaterial( { color: 0xffffff * Math.random() } )
            // );
            // boxMesh.matrixAutoUpdate = false;
            // boxMesh.matrix.fromArray( planePose.transform.matrix );
            // scene.add( boxMesh );
        })
    };

    public destroy() {
        this.renderer.xr.removeEventListener( 'planeadded', this.planeAdded);
        this.renderer.xr.removeEventListener( 'planeremoved', this.planeRemoved);
        this.renderer.xr.removeEventListener( 'planechanged', this.planeChanged);
        this.renderer.xr.removeEventListener( 'planesdetected', this.planesDetected );
    }
}