import {
  AmbientLight,
  Clock,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  WebGLRenderer,
} from 'three';

export function mountFlameScene(canvas, gsap) {
  try {
    const motionAllowed = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, .1, 40);
    camera.position.set(0, 0, 7.2);
    const compactScreen = window.matchMedia('(max-width: 760px)').matches;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !compactScreen });
    renderer.setClearColor(0x000000, 0);

    const model = new Group();
    scene.add(model);
    scene.add(new AmbientLight(0xffffff, 1.45));
    const keyLight = new PointLight(0xffb316, 18, 12);
    keyLight.position.set(2.5, 2, 4);
    scene.add(keyLight);
    const sideLight = new PointLight(0xf17820, 10, 10);
    sideLight.position.set(-2.5, -.8, 3);
    scene.add(sideLight);
    let inView = false;

    const outerShape = new Shape();
    outerShape.moveTo(0, 1.55);
    outerShape.bezierCurveTo(-.1, .75, -.92, .25, -.68, -.43);
    outerShape.bezierCurveTo(-.55, -.98, -.15, -1.32, 0, -1.4);
    outerShape.bezierCurveTo(.52, -1.02, .98, -.32, .64, .32);
    outerShape.bezierCurveTo(.42, .73, .12, .95, 0, 1.55);
    const outer = new Mesh(
      new ExtrudeGeometry(outerShape, { depth: .22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .07, bevelThickness: .08 }),
      new MeshStandardMaterial({ color: 0xf17820, emissive: 0x551500, roughness: .34, metalness: .08 }),
    );
    outer.position.z = -.12;
    model.add(outer);

    const innerShape = new Shape();
    innerShape.moveTo(0, .72);
    innerShape.bezierCurveTo(-.06, .22, -.38, -.12, -.27, -.52);
    innerShape.bezierCurveTo(-.16, -.84, .08, -.95, .17, -.98);
    innerShape.bezierCurveTo(.53, -.51, .39, -.08, .19, .2);
    innerShape.bezierCurveTo(.12, .38, .04, .54, 0, .72);
    const inner = new Mesh(
      new ExtrudeGeometry(innerShape, { depth: .1, bevelEnabled: true, bevelSegments: 2, bevelSize: .035, bevelThickness: .045 }),
      new MeshStandardMaterial({ color: 0xffb316, emissive: 0x6c2600, roughness: .3, metalness: .05 }),
    );
    inner.position.set(.08, -.06, .18);
    model.add(inner);

    const resizeScene = () => {
      const width = canvas.clientWidth || 160;
      const height = canvas.clientHeight || 190;
      const pixelRatioLimit = width < 760 ? 1 : width < 1050 ? 1.25 : 1.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 500 ? 8 : 7.2;
      camera.updateProjectionMatrix();
      if (!motionAllowed && inView) renderer.render(scene, camera);
    };
    resizeScene();
    new ResizeObserver(resizeScene).observe(canvas.parentElement);

    const rotation = { y: -.24 };
    if (motionAllowed) {
      gsap.to(rotation, {
        y: .24,
        ease: 'none',
        scrollTrigger: { trigger: '.principles-section', start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    }

    const clock = new Clock();
    const frameInterval = 1000 / 30;
    let lastFrame = 0;
    const render = (now = performance.now()) => {
      if (motionAllowed && now - lastFrame < frameInterval) return;
      lastFrame = now;
      const time = clock.getElapsedTime();
      if (motionAllowed) {
        model.rotation.y += (rotation.y - model.rotation.y) * .035;
        model.rotation.x = Math.sin(time * .55) * .035;
        model.rotation.z = Math.sin(time * .4) * .025;
      }
      renderer.render(scene, camera);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && document.visibilityState === 'visible';
      renderer.setAnimationLoop(inView && motionAllowed ? render : null);
      if (inView && !motionAllowed) render();
    }, { rootMargin: '100px' });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', () => {
      const shouldRender = inView && document.visibilityState === 'visible';
      renderer.setAnimationLoop(shouldRender && motionAllowed ? render : null);
      if (shouldRender && !motionAllowed) render();
    });
  } catch (error) {
    console.warn('Decorative YMR flame scene could not start.', error);
  }
}
