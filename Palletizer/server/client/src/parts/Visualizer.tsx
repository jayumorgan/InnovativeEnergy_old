import React, { useEffect, useRef, useState } from 'react';

import * as Three from "three";


// Styles.
import "./css/Visualizer.scss";
import wood from "./images/wood.jpg";



function Visualizer(){
    const mount = useRef<HTMLDivElement>(null);
    const [isAnimating, setAnimating] = useState(false);
    const controls = useRef<any>(null);
    let renderScene : any;
  
    useEffect(() => {

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height =  (mount.current as HTMLDivElement).clientHeight;
        let frameId : any;

        const scene = new Three.Scene();
        const camera = new Three.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new Three.WebGLRenderer({ antialias: true });


        let loader = new Three.TextureLoader();

        camera.position.z = 1;

        let [h, w, l] = [0.8, 8, 8];
        
        loader.load(wood, (t: Three.Texture)=>{

            let norm = Math.sqrt(w ** 2 + h ** 2 + l ** 2)
            let geometry = new Three.BoxGeometry(w/norm, h/norm, l/norm);
            let material = new Three.MeshBasicMaterial({ map : t });
            let cube = new Three.Mesh(geometry, material);
            cube.rotateX(0.3);
            // cube.rotateY(-0.3);

            scene.add(cube);
            renderer.setClearColor('white');
            renderer.setSize(width, height);
            renderer.render(scene, camera);
            
        });


        let handleResize = () => {
            width = (mount.current as HTMLDivElement).clientWidth;
            height = (mount.current as HTMLDivElement).clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderScene();
        }

        const animate = () => {
            // cube.rotation.x += 0.01
            // cube.rotation.y += 0.01

            // renderScene()
            // frameId = window.requestAnimationFrame(animate)
        }

        const start = () => {
            if (!frameId) {
                frameId = requestAnimationFrame(animate)
            }
        }

        const stop = () => {
            cancelAnimationFrame(frameId)
            frameId = null
        }

        (mount.current as HTMLDivElement).appendChild(renderer.domElement)
        window.addEventListener('resize', handleResize)
        // start()

        controls.current = { start, stop };
        // renderScene();

        // return () => {
        //     stop();
        //     (window as any).removeEventListener('resize', handleResize)
        //     (mount.current as HTMLDivElement).removeChild(renderer.domElement)

        //     scene.remove(cube)
        //     // geometry.dispose()
        //     // material.dispose()
        // }
    }, []);

  useEffect(() => {
      // renderScene();
    
    if (isAnimating) {
      controls.current.start()
    } else {
      controls.current.stop()
    }
  }, [isAnimating])
  
  return <div className="Visualizer" ref={mount} onClick={() => setAnimating(!isAnimating)} />
}
export default Visualizer;

