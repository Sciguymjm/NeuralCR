import './App.css'
import React from 'react'

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
        cr: 0
    }

    render() {
        return (
            <div className="App">
                {/*<img src={logo} className="App-logo" alt="logo" />*/}
                <h1>{Math.round(this.state.cr)}</h1>
                {this.selected_columns.map((column) => {
                    let input
                    if (["flies", "legendary"].indexOf(column) !== -1
                        || column.indexOf("resist") !== -1
                        || column.indexOf("immune") !== -1) {
                        input = <input name={column} type={"checkbox"}
                                       onChange={(event) =>
                                           this.changeEvent(event, column)}/>
                    } else if (column === "size") {
                        input = <select id="size" name="size" onChange={(event) =>
                            this.changeEvent(event, column)}>
                            {Object.keys(this.size_map).map((size) => {
                                return <option value={this.size_map[size]}>{size}</option>
                            })}
                        </select>
                    } else {
                        input = <input name={column} type={"number"} onChange={(event) =>
                            this.changeEvent(event, column)}/>
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

function predict() {

}

loadingModelPromise.then(() => {
    console.log("Model loaded")
    document.body.addEventListener("mousedown", predict)
})
export default App
