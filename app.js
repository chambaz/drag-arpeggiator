const React = require('react');
const ReactDOM = require('react-dom');
const Tone = require('tone');
const Anime = require('animejs');

/**
* Helper methods
*/
const Utils = {
	// return width / height of root container
	viewport: () => {
		const app = document.querySelector('[data-app]');
		return [app.offsetWidth, app.offsetHeight];
	},

	// map a value from one range to another
	map: (val, inMin, inMax, outMin, outMax) => {
		return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
	}
}


/**
* Canvas Component
* ----------------
*
* Root component that handles mouse events, stores coordinates and appends / removes child Note components
*/
class Canvas extends React.Component {
	constructor(props) {
		super(props);

		// initial state object
		this.state = {
			child: false,
			position: {},
			remove: false,
			showInstructions: true,
			// % coordinates for intro example swipe
			introSwipe: [[50, 31],[48, 30],[46, 30],[44, 30],[41, 30],[38, 30],[35, 30],[33, 30],[32, 31],[30, 33],[29, 34],[28, 36],[27, 38],[26, 41],[25, 43],[24, 46],[23, 49],[23, 51],[23, 53],[22, 55],[22, 56],[22, 57],[22, 57],[23, 59],[24, 60],[27, 63],[29, 65],[32, 67],[34, 68],[39, 70],[43, 71],[47, 71],[50, 71],[53, 71],[56, 71],[58, 70],[60, 69],[62, 68],[64, 67],[66, 65],[68, 63],[69, 61],[71, 59],[73, 56],[74, 54],[76, 51],[77, 49],[78, 46],[78, 43],[79, 40],[79, 36],[79, 33],[79, 30],[79, 28],[79, 26],[79, 25]],
			introRunning: true
		};

	}

	componentDidMount() {
		// set initial position as first step in intro swipe
		let relativeCoords = this.getIntroCoords(0);
		this.updatePosition({
			pageX: relativeCoords[0],
			pageY: relativeCoords[1]
		});

		// kick off intro swipe
		this.intro();
	}

	intro() {
		let i = 0,
			interval;

		// fake a touch event passing true to specify intro phase
		this.touch(true);

		// update position with next step in intro swipe
		const triggerUpdatePosition = () => {
			let coords = this.getIntroCoords(i);

			this.updatePosition({
				pageX: coords[0],
				pageY: coords[1]
			});

			// if the intro is no longer running then remove the child
			if(!this.state.introRunning) {
				this.removeChild();

			// if on the last step of intro then set timeout to remove child and set intro running to false
			} else if(i >= this.state.introSwipe.length - 1) {
				setTimeout(() => {
					this.removeChild();
					this.setState({introRunning: false});
				}, 2500);

			// otherwise increment step and recursively call function again
			} else {
				i++;
				setTimeout(() => {
					requestAnimationFrame(triggerUpdatePosition)
				}, 5);
			}
		};

		// kick off intro
		setTimeout(() => {
			requestAnimationFrame(triggerUpdatePosition);
		}, 250);
	}

	// on mousedown set child state property to true
	touch(intro = false) {
		let state = this.state;

		// cancel intro if still running
		if(!intro) {
			state.introRunning = false;
		}

		// if child is true then we are already rendering notes
		if (!this.state.child) {
			state.child = true;
		}

		this.setState(state);
	}

	// on mousemove update current mouse position
	updatePosition(positions) {
		let state = this.state;

		// if intro is running and this is a DOM event then stop here
		if(this.state.introRunning && positions.type) {
			return;

		// if child is active and this is a DOM event then remove instructions
		// user has started using application
		} else if(this.state.child && !this.state.remove && positions.type) {
			state.showInstructions = false;
		}

		// if this is a DOM event then prevent default
		// stops canvas scrolling on mobile
		if(positions.preventDefault) {
			positions.preventDefault();
		}

		// if this is a touch event then set positions to first touch in array
		// no multitouch support... yet
		// TODO: multitouch support!
		if(positions.touches && positions.touches.length) {
			positions = positions.touches[0];
		}

		// set new position
		state.position = {
			top: positions.pageY,
			left: positions.pageX
		};

		this.setState(state);
	}

	// on mouseup set child state property to false
	removeChild() {

		// if 'child' is false or 'remove' is true then we are already removing
		if (!this.state.child || this.state.remove) {
			return;
		}

		// set remove to true so we don't repeat this logic
		let state = this.state;
		state.remove = true;
		this.setState(state);

		// after a second (once animation is complete) set both child and remove to false to reset application
		setTimeout(() => {
			let state = this.state;
			state.child = false;
			state.remove = false;

			this.setState(state);
		}, 1000);
	}

	// return specified step in intro sequence
	// with absolute px positions based on % of viewport size
	getIntroCoords(i) {
		// width/height of root container
		let viewport = Utils.viewport();

		return [
			this.state.introSwipe[i][0] / 100 * viewport[0],
			this.state.introSwipe[i][1] / 100 * viewport[1]
		];
	}

	// render root component
	render() {
		let child = '';

		// if child is set to true then append a <Note /> component to the page
		// pass in remove boolean, position object and synth reference
		if (this.state.child) {
			child = <Note remove={this.state.remove} position={this.state.position} />
		}

		// render component and bind mouse event handlers
		return (
			<div className="canvas"
				onTouchStart={this.touch.bind(this, false)}
				onTouchEnd={this.removeChild.bind(this)}
				onTouchMove={this.updatePosition.bind(this)}
				onMouseDown={this.touch.bind(this, false)}
				onMouseMove={this.updatePosition.bind(this)}
				onMouseUp={this.removeChild.bind(this)}
				data-canvas>

				<a className="canvas__logo" target="_blank" href="https://www.digitalsurgeons.com" title="Digital Innovation Agency">
					<img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/123063/ds-grey.png" />
				</a>

				<h1 className="canvas__title">DragArpeggiator</h1>

				<p className="canvas__instructions"
					style={{opacity: this.state.showInstructions ? 1: 0}}
					data-instructions>Drag to make some noise</p>

				{child}
      		</div>
		);
	}
}


/**
* Note Component
* --------------
*
* Child component that handles audio/visual/animations
* Insert div.note > div.note__piece and animate with anime.js
* Generate arpeggio with ToneJS
* Base audio/visual on entropy value
*/
class Note extends React.Component {
	constructor(props) {
		super(props);

		// initial state object
		this.state = {
			position: this.props.position,
			notes: [],
			entropy: 0
		};

		// property to store setInterval reference
		this.interval = null;

		// instantiate audio components
		this.audio = {};

		// feedback delay
		this.audio.feedbackDelay = new Tone.FeedbackDelay({
			delayTime: "12n",
			feedback: 0.5,
			wet: 0
		}).toMaster();

		// chorus
		this.audio.chorus = new Tone.Chorus({
			frequency: 4,
			delayTime: 2.5,
			depth: 0.5,
			wet: 0
		}).connect(this.audio.feedbackDelay);

		// FM synth
		this.audio.synth = new Tone.FMSynth({

			// use position of mouse on x-axis for modulationIndex
			'modulationIndex': Utils.map(
				this.state.position.left,
				0,
				window.outerWidth,
				4,
				30
			),
			'portamento': 0,
			'envelope': {
				'attack': 0.01,
				'decay': 0.2
			},
			'modulation': {
				'type': 'square'
			},
			'modulationEnvelope': {
				'attack': 0.2,
				'decay': 0.01
			}
		}).connect(this.audio.chorus);

		// arpeggio patterns
		this.patterns = [
			['C5', 'E5', 'A5', 'C6', 'E6', 'C6', 'A5', 'E5'], // C6
			['C4', 'E4', 'A#4', 'C5', 'E5', 'C5', 'A#4', 'E4'], // Cmin7
			['C3', 'E3', 'G3', 'B4', 'E4', 'B4', 'G3', 'E3'], // Cmaj7
			['C2', 'E2', 'A#2', 'D3', 'G3', 'D3', 'A#2', 'E2'] // C9
		];

		// pattern
		this.audio.pattern = new Tone.Pattern((time, note) => {
			this.audio.synth.triggerAttackRelease(note, .1);
		}, this.findPattern());

		// pattern loops every 24 beats
		this.audio.pattern.interval = '24n';

		// kick off transport
		Tone.Transport.start();
	}

	// when component mounts start interval and tonejs pattern
	componentDidMount() {
		this.interval = setInterval(() => {
			window.requestAnimationFrame(this.addNotePieces.bind(this));
		}, 50);

		this.audio.pattern.start(0);
	}

	// handle updated props
	componentWillReceiveProps(newProps) {
		let state = this.state;

		// if position updated, e.g user moved the mouse
		if (newProps.position) {

			// store new position
			state.position = newProps.position;

			// reset entropy level
			state.entropy = 0;

			// find pattern based on mouse position on y-axis
			this.audio.pattern.values = this.findPattern();

			// set modulation index based on mouse position on x-axis
			this.audio.synth.modulationIndex.value = Utils.map(
				newProps.position.left,
				0,
				window.outerWidth,
				4,
				30
			);

			// update state
			this.setState(state);
		}

		// if remove property set to true then reset everything
		if (newProps.remove) {

			// clear interval
			clearInterval(this.interval);

			// ramp down delay to nothing
			this.audio.feedbackDelay.wet.rampTo(0, 1);

			// after a second (after animation) stop arpeggio
			setTimeout(() => {
				this.audio.pattern.stop(0);
			}, 1000);
		}
	}

	// called every 50ms
	addNotePieces() {
		let state = this.state,

			// build new note pieces using current position
			notePieces = <div className="note__inner" style={{top: this.state.position.top, left: this.state.position.left}}>
							<span className="note__piece--blue" data-note-piece></span>
							<span className="note__piece--green" data-note-piece></span>
							<span className="note__piece--red" data-note-piece></span>
							<span className="note__piece--yellow" data-note-piece></span>
							<span className="note__piece--pink" data-note-piece></span>
							<span className="note__piece--blue" data-note-piece></span>
							<span className="note__piece--green" data-note-piece></span>
							<span className="note__piece--red" data-note-piece></span>
							<span className="note__piece--yellow" data-note-piece></span>
							<span className="note__piece--pink" data-note-piece></span>
						</div>;

		// add new note pieces to notes store
		state.notes.push(notePieces);

		// increment entropy
		state.entropy += .01;

		// update state
		this.setState(state);

		// animate new note pieces that were just added to the DOM
		this.animate();

		// update audio components based on entropy values
		this.audio.feedbackDelay.wet.value = this.state.entropy;
		this.audio.chorus.wet.value = this.state.entropy;
		this.audio.synth.portamento = this.state.entropy / 20;
	}

	// animate newly inserted note pieces
	animate() {
		// increase the entropy value by one for use in animations
		// require more entropy in visual than in audio
		let animateEntropy = this.state.entropy + 1;

		// kick off anime targeting unanimated note pieces
		// use random translate/transform values using entropy value in equation
		Anime({
			targets: '[data-note-piece]:not(.animated)',
			translateX: () => {
				let num = 3 * animateEntropy;
				return Anime.random(num * -1, num) + 'rem';
			},
			translateY: () => {
				let num = 3 * animateEntropy;
				return Anime.random(num * -1, num) * animateEntropy + 'rem';
			},
			scale: () => {
				return Anime.random(5, 30) * animateEntropy / 10;
			},
			rotate: () => {
				return Anime.random(-900, 900) * animateEntropy;
			},
			delay: () => {
				return Anime.random(0, 100);
			},
			duration: () => {
				return Anime.random(500, 750);
			},
			opacity: .7,
			direction: 'alternate',
		});

		// once animation kicked off set all note pieces as 'animated'
		[].forEach.call(document.querySelectorAll('[data-note-piece]'), (piece) => {
			piece.classList.add('animated');
		});
	}

	// find arpeggio pattern based on mouse position on y-axis
	findPattern() {
		return this.patterns[Math.round(Utils.map(
			this.state.position.top,
			0,
			document.body.offsetHeight,
			0,
			this.patterns.length - 1
		))];
	}

	// render note component with child note pieces
	render() {
		return (
			<div className="note">
				{this.state.notes}
			</div>
		);
	}
}

// render the application
ReactDOM.render(<Canvas />, document.querySelector('[data-app]'));
