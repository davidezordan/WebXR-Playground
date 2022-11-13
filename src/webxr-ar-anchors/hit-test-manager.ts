import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshPhongMaterial, RingGeometry, Scene } from "three";

// To be implemented when hit-test can be enabled on Quest. Investigate if it's possible to use now with workarounds.
export class HitTestManager {
    constructor(private scene: Scene) {
    }

    private reticle?: Mesh;

    private initHitTest() {
        //

        // TODO: investigate why it's not working on Quest.

        this.reticle = new Mesh(
            new RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new MeshBasicMaterial()
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );

        //
    }

    private handleControllerEventsHitTest(controller: Group) {
        controller.addEventListener('select', async (event: any) => {
            const geometry = new CylinderGeometry( 0.1, 0.1, 0.2, 32 ).translate( 0, 0.1, 0 );
            if ( this.reticle?.visible ) {
                const material = new MeshPhongMaterial( { color: 0xffffff * Math.random() } );
                const mesh = new Mesh( geometry, material );
                this.reticle?.matrix.decompose( mesh.position, mesh.quaternion, mesh.scale );
                mesh.scale.y = Math.random() * 2 + 1;
                this.scene.add( mesh );
            }
        })
    };
}