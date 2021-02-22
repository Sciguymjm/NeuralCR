import './App.css'
import React from 'react'
import monsters from './monsters.json'

const onnx = require('onnxjs')
const sess = new onnx.InferenceSession()
const loadingModelPromise = sess.loadModel("./onnx_model.onnx")

class App extends React.Component {
    size_map = {
        'Tiny': 0,
        'Small': 1,
        'Medium': 2,
        'Large': 3,
        'Huge': 4,
        'Gargantuan': 5
    }
    selected_columns = ['hp', 'ac', 'speed', 'flies', 'save', 'toHit',
        'str', 'dex', 'con', 'int', 'wis', 'cha', 'legendary',
        'damageTags', 'conditionInflict', 'size',
        'immune_cold', 'immune_acid',
        'immune_lightning', 'immune_poison', 'immune_fire', 'immune_psychic',
        'immune_bludgeoning', 'immune_piercing', 'immune_slashing',
        'immune_necrotic', 'immune_thunder', 'immune_force', 'immune_radiant',
        'resist_cold', 'resist_acid', 'resist_lightning', 'resist_poison',
        'resist_fire', 'resist_psychic', 'resist_bludgeoning',
        'resist_piercing', 'resist_slashing', 'resist_necrotic',
        'resist_thunder', 'resist_force', 'resist_radiant']
    state = {
        values: {},
        preset: -1,
        cr: 0
    }

    render() {
        return (
            <div className="App">
                {/*<img src={logo} className="App-logo" alt="logo" />*/}
                <h1>{Math.round(this.state.cr)}</h1>
                <select id="preset" name="preset" onChange={(event) => this.changePreset(event)}
                value={this.state.preset}>
                    <option value={-1}>Select SRD monster preset...</option>
                    {monsters.names.map((name, i) => {
                        return <option value={i}>{name}</option>
                    })}
                </select>
                <button onClick={this.clear}>Clear</button>
                {this.selected_columns.map((column) => {
                    let input
                    if (["flies", "legendary"].indexOf(column) !== -1
                        || column.indexOf("resist") !== -1
                        || column.indexOf("immune") !== -1) {
                        input = <input name={column} type={"checkbox"}
                                       onChange={(event) =>
                                           this.changeEvent(event, column)}
                                       checked={this.state.values[column]}/>
                    } else if (column === "size") {
                        input = <select id="size" name="size" onChange={(event) =>
                            this.changeEvent(event, column)}
                                        value={this.state.values[column] === undefined ? 0 : this.state.values[column]}>
                            {Object.keys(this.size_map).map((size) => {
                                return <option value={this.size_map[size]}>{size}</option>
                            })}
                        </select>
                    } else {
                        input = <input name={column} type={"number"} onChange={(event) =>
                            this.changeEvent(event, column)}
                                       value={this.state.values[column] === undefined ? 0 : this.state.values[column]}/>
                    }
                    return <p key={column}>
                        <span>{column}</span>
                        {input}
                    </p>
                })}
            </div>
        )
    }

    changeEvent(event, column) {
        const {values} = this.state
        if (event.target.type === "checkbox") {
            values[column] = event.target.checked
        } else {
            values[column] = event.target.value
        }
        this.setState({values}, () => {
            this.predict()
        })
    }

    changePreset(event) {
        const idx = event.target.value
        if (idx === "-1")
            return
        const values = {}
        this.selected_columns.forEach((column, i) => {
            if (["flies", "legendary"].indexOf(column) !== -1
                || column.indexOf("resist") !== -1
                || column.indexOf("immune") !== -1) {
                console.log(column, monsters.data[parseInt(idx)][i], monsters.data[parseInt(idx)][i] === 1.0)
                values[column] = monsters.data[parseInt(idx)][i] === 1.0
            } else {
                values[column] = monsters.data[parseInt(idx)][i]
            }
        })
        this.setState({values, preset: idx}, () => {
            this.predict()
        })
    }

    clear = () => {
        this.setState({values: {}, preset: -1, cr: 0})
    }

    predict() {
        const {values} = this.state
        const input = []
        this.selected_columns.forEach((column) => {
            if (Object.keys(values).includes(column)) {
                if (typeof values[column] == "boolean") {
                    input.push(values[column] ? 1 : 0)
                } else {
                    input.push(parseFloat(values[column]))
                }
            } else {
                input.push(0.0)
            }
        })
        const tensor = new onnx.Tensor(new Float32Array(input), "float32", [1, this.selected_columns.length])

        sess.run([tensor]).then((outputMap) => {
            const outputTensor = outputMap.values().next().value
            const predictions = outputTensor.data
            this.setState({cr: predictions})
        })

    }
}

loadingModelPromise.then(() => {
    console.log("Model loaded")
    console.log(monsters)
})
export default App
