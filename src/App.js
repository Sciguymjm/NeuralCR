import './App.css'
import React from 'react'
import monsters from './monsters.json'

import {Text, Page, Select, Input, Checkbox, Grid, Divider, Link, Button} from '@geist-ui/react'

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
                'Cold damage', 'Acid damage', 'Lightning damage', 'Poison damage',
                'Fire damage', 'Psychic damage', 'Bludgeoning damage',
                'Piercing damage', 'Slashing damage', 'Necrotic damage',
                'Thunder damage', 'Force damage', 'Radiant damage',
            ]
        },
        {
            "title": "Resistances",
            "names": [
                'Cold damage', 'Acid damage', 'Lightning damage', 'Poison damage',
                'Fire damage', 'Psychic damage', 'Bludgeoning damage',
                'Piercing damage', 'Slashing damage', 'Necrotic damage',
                'Thunder damage', 'Force damage', 'Radiant damage']
        }
    ]
    columns = this.selected_columns.map((group) => group["names"].map((name) => group["title"] + name)).flat(1)
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
                <Text h1>{this.state.cr < 1 ? Number(this.state.cr).toFixed(2) : Math.round(this.state.cr)}</Text>
                <Text h5>predicted challenge rating</Text>
                <Divider/>
                <Select onChange={(event) => this.changePreset(event)}
                        value={this.state.preset} placeholder="Select SRD monster preset...">
                    {monsters.names.map((name, i) => <Select.Option value={i.toString()}>{name}</Select.Option>)}
                </Select>
                <Button auto onClick={this.clear}>Clear</Button>
                {this.selected_columns.map((group) => {
                    return <>
                        <Divider>{group["title"]}</Divider>
                        <Grid.Container gap={2} justify="center">
                            {group["names"].map((column) => {
                                const column_id = group["title"] + column
                                let input
                                if (["BasicHas fly speed", "AttributesLegendary"].indexOf(column_id) !== -1
                                    || column_id.endsWith("damage")) {
                                    input = <Checkbox name={column_id}
                                                      size="large"
                                                      onChange={(event) =>
                                                          this.changeEvent(event, column_id)}
                                                      checked={this.state.values[column_id] === 1}/>
                                } else if (column_id === "AttributesSize") {
                                    input = <Select id="size" name="size" onChange={(event) =>
                                        this.changeEvent(event, column_id)}
                                                    value={this.state.values[column_id] === undefined ? "0" : this.state.values[column_id].toString()}>
                                        {Object.keys(this.size_map).map((size) => {
                                            return <Select.Option
                                                value={this.size_map[size].toString()}>{size}</Select.Option>
                                        })}
                                    </Select>
                                } else {
                                    input = <Input name={column_id} type={"number"} onChange={(event) =>
                                        this.changeEvent(event, column_id)}
                                                   value={this.state.values[column_id] === undefined ? 0 : this.state.values[column_id]}/>
                                }
                                return <Grid xs={24} md={12} key={column} style={{padding: "5px"}}>
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
        } else if (event.target.value === undefined) {
            values[column] = event.target.checked ? 1 : 0
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
export default App
