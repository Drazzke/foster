import {GameWindow, Graphics, IO, Scene} from "./";
import {Assets, Sound} from "./../assets";
import {DefaultOverlapTests} from "./../components/colliders/collider";
import {Keyboard, Mouse} from "./../input";
import {Shaders} from "./../util";

/**
 * Current game Client
 */
export enum Client
{
	/**
	 * Running in Electron
	 */
	Electron,
	/**
	 * Running in the Browser
	 */
	Browser,
}

/**
 * Core of the Foster Engine. Initializes and Runs the game.
 */
export class Engine
{
	/**
	 * Foster Engine version
	 * major.minor.build
	 */
	public static version:string = "0.1.11";

	/**
	 * The root HTML event that the game Canvas is created in (for the actual Canvas element, see Engine.graphics.screen)
	 */
	public static get root():HTMLElement { return Engine.instance.root; }

	/**
	 * Current Client (Client.Desktop if in Electron and Client.Web if in the browser)
	 */
	public static get client():Client { return Engine.instance.client; }

	/**
	 * Gets the current game Scene
	 */
	public static get scene():Scene
	{
		return (Engine.instance.nextScene != null ? Engine.instance.nextScene :Engine.instance.scene);
	}

	/**
	 * Gets the Game Width, before being scaled up / down to fit in the screen
	 */
	public static get width():number { return Engine.instance.width; }

	/**
	 * Gets the Game Height, before being scaled up / down to fit in the screen
	 */
	public static get height():number { return Engine.instance.height; }

	/**
	 * Toggles Debug Mode, which shows hitboxes and allows entities to be dragged around
	 */
	public static get debugMode():boolean { return Engine.instance.debuggerEnabled; }
	public static set debugMode(v:boolean) { Engine.instance.debuggerEnabled = v; }

	/**
	 * Delta Time (time, in seconds, since the last frame)
	 */
	public static get delta():number { return Engine.instance.dt; }

	/**
	 * Total elapsed game time (time, in seconds, since the Engine was started)
	 */
	public static get elapsed():number { return Engine.instance.elapsed; }

	/**
	 * Gets the current Engine graphics (used for all rendering)
	 */
	public static get graphics():Graphics { return Engine.instance.graphics; }

	/**
	 * Gets or sets the global sound volume multiplier
	 */
	public static get volume():number { return Engine._volume; }
	public static set volume(n:number)
	{
		Engine._volume = n;
		for (const sound of Sound.active)
			sound.volume = sound.volume;
	}
	private static _volume:number = 1;

	/**
	 * Mutes or Unmutes the entire game
	 */
	public static get muted():boolean { return Engine._muted; }
	public static set muted(m:boolean)
	{
		Engine._muted = m;
		for (const sound of Sound.active)
			sound.muted = sound.muted;
	}
	private static _muted:boolean = false;

	/**
	 * Starts up the Game Engine
	 * @param title 	Window Title
	 * @param width 	Game Width
	 * @param height 	Game Height
	 * @param scale 	Scales the Window (on Desktop) to width * scale and height * scale
	 * @param ready 	Callback when the Engine is ready
	 */
	public static start(title:string, width:number, height:number, scale:number, ready:() => void):void
	{
		// instantiate
		Engine.started = true;
		new Engine();
		new GameWindow();

		// window
		GameWindow.title = title;
		GameWindow.resize(width * scale, height * scale);
		GameWindow.center();

		// wait for window
		window.onload = () =>
		{
			const c = String.fromCharCode(0x25cf);
			console.log("%c " + c + " ENGINE START " + c + " ", "background:#222; color:#ff44aa;");
			Engine.instance.root = document.getElementsByTagName("body")[0];

			// init
			DefaultOverlapTests();
			IO.init();
			Engine.instance.graphics = new Graphics(Engine.instance);
			Engine.instance.graphics.load();
			Engine.resize(width, height);
			Shaders.init();
			Mouse.init();
			Keyboard.init();

			// start update loop
			Engine.instance.step();

			// ready callback for game
			if (ready !== undefined)
				ready();
		};
	}

	/**
	 * Goes to a new Scene
	 * @param scene 	The Scene to go to
	 * @param disposeLastScene 	If the last scene should be disposed
	 */
	public static goto(scene:Scene, disposeLastScene:boolean):Scene
	{
		const lastScene = Engine.scene;
		Engine.instance.nextScene = scene;
		Engine.instance.disposeLastScene = disposeLastScene;
		return scene;
	}

	/**
	 * Ends the Game
	 */
	public static exit():void
	{
		if (Engine.started && !Engine.exiting)
			Engine.instance.exit();
	}

	/**
	 * Resizes the game to the given size
	 * @param width 	new Game Width
	 * @param height 	new Game Height
	 */
	public static resize(width:number, height:number):void
	{
		Engine.instance.width = width;
		Engine.instance.height = height;
		Engine.instance.graphics.resize();
	}

	/**
	 * Checks that the given value is true, otherwise throws an error
	 */
	public static assert(value:boolean, message:string):boolean
	{
		if (!value)
			throw message;
		return value;
	}

	private static instance:Engine = null;
	private static started:boolean = false;
	private static exiting:boolean = false;

	private client:Client;
	private scene:Scene = null;
	private nextScene:Scene = null;
	private disposeLastScene:boolean;
	private width:number;
	private height:number;
	private dt:number;
	private elapsed:number;
	private startTime:number;
	private lastTime:number;
	private root:HTMLElement;
	private graphics:Graphics;
	private debuggerEnabled:boolean;

	constructor()
	{
		if (Engine.instance != null)
			throw "Engine has already been instantiated";
		if (!Engine.started)
			throw "Engine must be instantiated through static Engine.start";

		Engine.instance = this;
		this.client = Client.Browser;

		if (typeof(window) !== "undefined")
		{
			const w = (window as any);
			if (w.process !== undefined && w.process.versions !== undefined && w.process.versions.electron !== undefined)
				this.client = Client.Electron;
		}

		this.startTime = Date.now();
	}

	private step():void
	{
		// time management!
		const time = Date.now();
		this.elapsed = Math.floor(time - this.startTime) / 1000;
		this.dt = Math.floor(time - this.lastTime) / 1000;
		this.lastTime = time;

		// update graphics
		this.graphics.update();

		// update inputs
		Mouse.update();
		Keyboard.update();

		// swap scenes
		if (this.nextScene != null)
		{
			if (this.scene != null)
			{
				this.scene.ended();
				if (this.disposeLastScene)
					this.scene.dispose();
			}
			this.scene = this.nextScene;
			this.nextScene = null;
			this.scene.begin();
		}

		// update scene
		if (this.scene != null)
			this.scene.update();

		if (this.nextScene == null)
		{
			// begin drawing
			this.graphics.reset();

			// render current scene
			if (this.scene != null)
				this.scene.render();

			// final flush on graphics
			this.graphics.finalize();
		}

		// update sounds
		for (const sound of Sound.active)
			sound.update();

		// do it all again!
		if (!Engine.exiting)
			requestAnimationFrame(this.step.bind(this));
	}

	private exit()
	{
		Engine.exiting = true;
		Assets.unload();
		Engine.graphics.unload();

		if (Engine.client === Client.Electron)
		{
			const remote = require("electron").remote;
			const win = remote.getCurrentWindow();
			win.close();
		}
	}

}
