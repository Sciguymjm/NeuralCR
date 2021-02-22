import './App.css'
import React from 'react'
import monsters from './monsters.json'

import {Text, Page, Select, Input, Checkbox, Grid, Divider, Link} from '@geist-ui/react'

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
    // selected_columns = ['hp', 'ac', 'speed', 'flies', 'save', 'toHit',
    //     'str', 'dex', 'con', 'int', 'wis', 'cha', 'legendary',
    //     'damageTags', 'conditionInflict', 'size',
    //     'immune_cold', 'immune_acid',
    //     'immune_lightning', 'immune_poison', 'immune_fire', 'immune_psychic',
    //     'immune_bludgeoning', 'immune_piercing', 'immune_slashing',
    //     'immune_necrotic', 'immune_thunder', 'immune_force', 'immune_radiant',
    //     'resist_cold', 'resist_acid', 'resist_lightning', 'resist_poison',
    //     'resist_fire', 'resist_psychic', 'resist_bludgeoning',
    //     'resist_piercing', 'resist_slashing', 'resist_necrotic',
    //     'resist_thunder', 'resist_force', 'resist_radiant']
    selected_columns = [
        {
            "title": "Basic",
            "names": ['HP (average)', 'Armor Class', 'Speed (max)', 'Has fly speed', 'Number of saves proficient in', 'Max + to hit']
        },
        {
            "title": "Attributes",
            "names": [
                'Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha', 'Legendary',
                'Unique damage types inflicted', 'Unique conditions inflicted', 'Size'
            ]
        },
        {
            "title": "Immunities",
            "names": [
                'Immune to cold damage', 'Immune to acid damage',
                'Immune to lightning damage', 'Immune to poison damage', 'Immune to fire damage', 'Immune to psychic damage',
                'Immune to bludgeoning damage', 'Immune to piercing damage', 'Immune to slashing damage',
                'Immune to necrotic damage', 'Immune to thunder damage', 'Immune to force damage', 'Immune to radiant damage',
            ]
        },
        {
            "title": "Resistances",
            "names": [
                'Resistance to cold damage', 'Resistance to acid damage', 'Resistance to lightning damage', 'Resistance to poison damage',
                'Resistance to fire damage', 'Resistance to psychic damage', 'Resistance to bludgeoning damage',
                'Resistance to piercing damage', 'Resistance to slashing damage', 'Resistance to necrotic damage',
                'Resistance to thunder damage', 'Resistance to force damage', 'Resistance to radiant damage']
        }
    ]
    columns = this.selected_columns.map((group) => group["names"]).flat(1)
    state = {
        values: {},
        preset: null,
        cr: 0
    }

    render() {
        return (
            <Page size="mini">
                <Page.Header>
                    <Text h2>Neural Challenge Rating</Text>
                </Page.Header>
                <Text h1>{Math.round(this.state.cr)}</Text>
                <Text h5>predicted challenge rating</Text>
                <Divider/>
                <Select onChange={(event) => this.changePreset(event)}
                        value={this.state.preset} placeholder="Select SRD monster preset...">
                    {monsters.names.map((name, i) => <Select.Option value={i.toString()}>{name}</Select.Option>)}
                </Select>
                <button onClick={this.clear}>Clear</button>
                {this.selected_columns.map((group) => {
                    return <>
                        <Divider>{group["title"]}</Divider>
                        <Grid.Container gap={2} justify="center">
                            {group["names"].map((column) => {
                                let input
                                if (["Has fly speed", "Legendary"].indexOf(column) !== -1
                                    || column.indexOf("Resist") !== -1
                                    || column.indexOf("Immune") !== -1) {
                                    input = <Checkbox name={column}
                                                      onChange={(event) =>
                                                          this.changeEvent(event, column)}
                                                      checked={this.state.values[column] === 1}/>
                                } else if (column === "Size") {
                                    input = <Select id="size" name="size" onChange={(event) =>
                                        this.changeEvent(event, column)}
                                                    value={this.state.values[column] === undefined ? "0" : this.state.values[column].toString()}>
                                        {Object.keys(this.size_map).map((size) => {
                                            return <Select.Option
                                                value={this.size_map[size].toString()}>{size}</Select.Option>
                                        })}
                                    </Select>
                                } else {
                                    input = <Input name={column} type={"number"} onChange={(event) =>
                                        this.changeEvent(event, column)}
                                                   value={this.state.values[column] === undefined ? 0 : this.state.values[column]}/>
                                }
                                return <Grid xs={24} md={12} key={column}>
                                    <Grid xs key={"column"}>{column}</Grid>
                                    <Grid xs key={"input"}>{input}</Grid>
                                </Grid>
                            })}

                        </Grid.Container>
                    </>
                })}

                <Divider/>
                <Text>Made by <Link href={"https://twitter.com/Sciguymjm"} color>Matthew Mage</Link></Text>
            </Page>
        )
    }

    changeEvent(event, column) {
        const {values} = this.state
        if (typeof event === "string") {
            values[column] = parseInt(event)
        }
        else if (event.target.value === undefined) {
            values[column] = event.target.checked
        } else {
            values[column] = event.target.value
        }
        this.setState({values}, () => {
            this.predict()
        })
    }

    changePreset(event) {
        if (event === null)
            return
        const idx = parseInt(event)
        if (idx === -1)
            return
        const values = {}

        this.columns.forEach((column, i) => {
            if (["flies", "legendary"].indexOf(column) !== -1
                || column.indexOf("resist") !== -1
                || column.indexOf("immune") !== -1) {
                values[column] = monsters.data[idx][i] === 1.0
            } else {
                values[column] = monsters.data[idx][i]
            }
        })
        this.setState({values, preset: idx.toString()}, () => {
            this.predict()
            console.log(this.state.values)
        })
    }

    clear = () => {
        this.setState({values: {}, preset: null, cr: 0})
    }

    predict() {
        const {values} = this.state
        const input = []
        this.columns.forEach((column) => {
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
        const tensor = new onnx.Tensor(new Float32Array(input), "float32", [1, this.columns.length])

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
