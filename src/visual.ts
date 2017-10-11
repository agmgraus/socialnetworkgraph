

module powerbi.extensibility.visual {
    export class Visual implements IVisual {


        private updateCount: number;
        private _settings: SocialNetworkGraphSettings

        private get settings(): SocialNetworkGraphSettings {
            if (this._settings == null || this._settings == undefined) {
                this._settings = new SocialNetworkGraphSettings();
            }

            return this._settings;
        }


        private targetElement: HTMLElement;

        private host: IVisualHost;

        private color: any;

        private links: PeopleGraphLink[] = [];
        private nodes: PeopleGraphNode[] = [];

        private defs: any;
        private link: any;
        private node: any;
        private photo: any;
        private clipPathPhoto: any;
        private forceSimulation;

        private sizes: number[] = [];

        private numberOfDataRows: number = 0;

        private linkSelection;
        private nodeSelection;

        private svg;

        private d3: any;

        private table: DataViewTable;
        private width: number;
        private height: number;

        private static DefaultImage: string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAbCAMAAAHNDTTxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACuUExURQAAAMbGxvLy8sfHx/Hx8fLy8vHx8cnJycrKyvHx8fHx8cvLy/Ly8szMzM3NzfHx8dDQ0PHx8fLy8vHx8e/v79LS0tPT0/Ly8tTU1NXV1dbW1vHx8fHx8fDw8NjY2PT09PLy8vLy8vHx8fLy8vHx8fHx8enp6fDw8PLy8uPj4+Tk5OXl5fHx8b+/v/Pz8+bm5vHx8ejo6PLy8vHx8fLy8sTExPLy8vLy8sXFxfHx8YCtMbUAAAA6dFJOUwD/k/+b7/f///+r/////0z/w1RcEP//ZP///4fj/v8Yj3yXn/unDEhQ////YP9Y/8//aIMU/9+L/+fzC4s1AAAACXBIWXMAABcRAAAXEQHKJvM/AAABQElEQVQoU5WS61LCMBCFFymlwSPKVdACIgWkuNyL+P4v5ibZ0jKjP/xm0uw5ySa7mRItAhnMoIC5TwQZdCZiZjcoC8WU6EVsmZgzoqGdxafgvJAvjUXCb2M+0cXNsd/GDarZqSf7av3M2P1E3xhfLkPUvLD5joEYwVVJQXM6+9McWUwLf4nDTCQZAy96UoDjNI/jhl3xPLbQamu8xD7iaIsPKw7GJ7KZEnWLY3Gi8EFj5nqibXnwD5VEGjJXk5sbpLppfvvo1RazQVrhSopPK4TODrtnjS3dY4ic8KurruWQYF+UG60BacexTMyT2jlNg41dOmKvTpkUd/Jevy7ZxQ61ULRUpoododx8GeDPvIrktbFVdUsK6f8Na5VlVpjZJtowTXVy7kfXF5wCaV1tqXAFuIdWJu+JviaQzNzfQvQDGKRXXEmy83cAAAAASUVORK5CYII=';

        // Creates instance of Visual. This method is only called once.
        // options - Contains references to the element that will contain the visual and a reference to the host which contains services.

        private colorPalette: IColorPalette;

        constructor(options: VisualConstructorOptions) {
            try {


                console.log('Visual constructor, options:', options);
                this.host = options.host;
                this.targetElement = options.element;

                let w: any = window;
                this.d3 = w.d3;


                //00 Create D3 container object 
                this.svg = this.d3.select(this.targetElement).append('svg');
                this.defs = this.svg.append('svg:defs');

                this.colorPalette = options.host.colorPalette;

                //this.color = this.d3.scaleOrdinal(this.d3.schemeCategory10);
            }
            catch (err) {
                console.log(err);
            }
        }

        // Updates the state of the visual. Every sequential databinding and resize will call update.
        // options - Contains references to the size of the container and the dataView which contains all the data the visual had queried.

        public update(options: VisualUpdateOptions) {
            try {

                console.log('Visual update, options:', options);

                this.table = options.dataViews[0].table;
                this.width = options.viewport.width
                this.height = options.viewport.height

                console.log('this.table.columns', this.table.columns);
                console.log('this.table.rows', this.table.rows);

                this._settings = SocialNetworkGraphSettings.parse<SocialNetworkGraphSettings>(options.dataViews[0]);

                console.log('Settings:', this._settings);


                //00: Check to ensure all required fields are bound
                if (this.isAllDataBound()) {
                    //01: Transform DataViewTable to Model Objects
                    this.ConvertDataView2ModelData();

                    //02: 
                    this.calculateNodeSizes();

                    if (this.hasColor()) {
                        this.calculateNodeColors();
                    }

                    if (this.hasLinkWeight()) {
                        this.calculateLinksStrokeWidth();
                    }
                    console.log('this.nodes', this.nodes);
                    console.log('this.links', this.links);

                    //03: Create DOM Elements using D3

                    if (this.numberOfDataRows != this.table.rows.length) {
                        this.RemoveAll();
                    }

                    this.RenderPeopleGraph();

                    this.numberOfDataRows = this.table.rows.length;
                }
            }
            catch (err) {
                console.log(err);
            }

        }


        private ConvertDataView2ModelData = () => {
            console.log('ConvertDataView2ModelData');

            try {

                this.nodes = [];
                this.links = [];

                let sourceNode: PeopleGraphNode;
                let targetNode: PeopleGraphNode;

                for (let row of this.table.rows) {
                    let source = this.getValue(row, "SourceName").toString();
                    let target = this.getValue(row, "TargetName").toString();

                    if (source != "" && target != "") {
                        let filterSource = this.nodes.filter((n) => { return n.name == source })
                        let filterTarget = this.nodes.filter((n) => { return n.name == target })

                        if (filterSource.length > 0) {
                            sourceNode = filterSource[0];
                        }
                        else {
                            let sourcePhoto = this.getValue(row, "SourcePhoto").toString();
                            let sourceSize: number = Number(this.getValue(row, "SourceSize"));
                            let sourceColor: string = this.getValue(row, "SourceColor").toString();
                            let sourceExtraInfo: string = this.getValue(row, "SourceExtraInfo").toString();

                            sourceNode =
                                {
                                    name: source,
                                    photo: sourcePhoto || "",
                                    size: sourceSize || 1,
                                    color: this.settings.nodes.nodeBorderColor,
                                    color_key: sourceColor || 'none',
                                    extraInfo: sourceExtraInfo
                                };

                            this.nodes.push(sourceNode);
                        }


                        if (filterTarget.length > 0) {
                            targetNode = filterTarget[0];
                        }
                        else {
                            let targetPhoto = this.getValue(row, "TargetPhoto").toString();
                            let targetSize: number = Number(this.getValue(row, "TargetSize"));
                            let targetColor: string = this.getValue(row, "TargetColor").toString();
                            let targetExtraInfo: string = this.getValue(row, "TargetExtraInfo").toString();

                            targetNode =
                                {
                                    name: target,
                                    photo: targetPhoto || "",
                                    size: targetSize || 1,
                                    color: this.settings.nodes.nodeBorderColor,
                                    color_key: targetColor || 'none',
                                    extraInfo: targetExtraInfo
                                };

                            this.nodes.push(targetNode);
                        }

                        let linkWeight: number = Number(this.getValue(row, "LinkWeight"));

                        let link = {
                            source: sourceNode,
                            target: targetNode,
                            weight: linkWeight || 1,
                            stroke_width: 1
                        }

                        this.links.push(link);
                    }
                }
            }
            catch (err) {
                console.log('ConvertDataView2ModelData error:', err)

            }
        }

        private hasColumnBound(columnName: string) {
            for (let col of this.table.columns) {
                if (col.roles[columnName] != undefined) {
                    return true;
                }
            }
            return false;
        }

        private getDataSourceField(columnName: string) {
            try {
                for (let col of this.table.columns) {
                    if (col.roles[columnName] != undefined) {
                        return col.displayName;
                    }
                }
            }
            catch (err) {
                console.log('getValue error:', err)

            }

            return "";

        }

        private getValue(row: DataViewTableRow, columnName: string) {
            try {
                let index: number = 0;
                for (let col of this.table.columns) {
                    if (col.roles[columnName] != undefined) {
                        if (row[index] != undefined && row[index] != null)
                            return row[index];
                        else
                            return "";
                    }
                    index++;
                }
            }
            catch (err) {
                console.log('getValue error:', err)

            }

            return "";
        }

        private RemoveAll = () => {
            console.log('RemoveAll');

            this.defs.remove();
            this.svg.remove();
            this.svg = this.d3.select(this.targetElement).append('svg');
            this.defs = this.svg.append('svg:defs');
        }

        private RenderPeopleGraph = () => {
            console.log('RenderPeopleGraph');

            try {
                //Update size svg
                this.svg.attr('width', this.width).attr('height', this.height);
                //this.svg

                //Bind Model Data to DOM Objects
                this.link = this.svg.selectAll('.link').data(this.links);

                //Create missing DOM Elements
                this.link.enter()
                    .append('line')
                    .attr('class', 'link');

                //Update DOM elements
                //Delete DOM Elements
                this.link.exit().remove();

                //01 Bind Model Data to DOM Objects
                this.node = this.svg.selectAll('.node').data(this.nodes);

                //02 Create missing DOM Elements
                this.node.enter()
                    .append('circle')
                    .attr('class', 'node');

                //03 Update DOM elements
                this.node
                    .attr("stroke", function (d) {
                        return d.color;
                    })
                    .attr("r", function (d) {
                        return d.r + 5;
                    })
                    .call(this.d3.drag()
                        .on("start", this.dragstarted)
                        .on("drag", this.dragged)
                        .on("end", this.dragended));

                //04 Delete DOM Elements
                this.node.exit().remove();


                this.photo = this.svg.selectAll('.photo')
                    .data(this.nodes);

                this.photo.enter()
                    .append('image')
                    .attr('class', 'photo');

                this.photo
                    .attr('xlink:href', function (d) {
                        return d.photo
                    })
                    .attr('width', function (d) {
                        return d.r * 2
                    })
                    .attr('height', function (d) {
                        return d.r * 2
                    })
                    // .attr('transform', function(d) { return 'translate(' + parseInt(d.x+20)+','+parseInt(d.y+20)+')'} )
                    .attr('clip-path', function (d, i) {
                        return 'url(#clipPathPhoto' + i + ')'
                    }).on("mouseover", this.node_mouseover)

                    .on("mouseout", this.node_mouseout)
                    .call(this.d3.drag()
                        .on("start", this.dragstarted)
                        .on("drag", this.dragged)
                        .on("end", this.dragended))
                    ;

                this.photo.exit().remove();

                this.clipPathPhoto = this.defs.selectAll('.clipPathPhoto')
                    .data(this.nodes);

                this.clipPathPhoto.enter()
                    .append('clipPath')
                    .attr('id', function (d, i) {
                        return 'clipPathPhoto' + i
                    })
                    .attr('class', 'clipPathPhoto')
                    .append('circle')
                    .attr('class', 'clipPathPhotoCircle')
                    .attr('r', function (d) {
                        return d.r
                    });

                this.clipPathPhoto.exit().remove();


                this.forceSimulation = this.d3.forceSimulation();

                //Add nodes
                this.forceSimulation.nodes(this.nodes);

                //Add Links
                this.forceSimulation.force("link_nodes_together", this.d3.forceLink()
                    .links(this.links)
                    .id(function (d: PeopleGraphLink) {
                        return d.index
                    })
                    .distance(function (d: PeopleGraphLink) {
                        return (d.source.r + d.target.r) * 1.5
                    })
                    .strength(function (d: PeopleGraphLink) {
                        return d.stroke_width
                    })
                );
                //Add additional force functions
                this.forceSimulation
                    .force("center_nodes", this.d3.forceCenter(this.width / 2, this.height / 2))
                    .force('push_them_apart', this.d3.forceManyBody()
                        .strength(100))
                    .force('collision_detect', this.d3.forceCollide()
                        .radius(function (d: any) {
                            return (d.r) * 1.5
                        }))

                    ;

                this.forceSimulation.on("tick", this.ticked);

            }
            catch (err) {
                console.log('RenderPeoplGraph error:', err)

            }

        }

        ticked = () => {

            //Update all DOM Elements

            this.svg.selectAll('.node').data(this.nodes)
                .attr("cx", function (d) {
                    //d.x = Math.max(d.r, Math.min(this.width - d.r, d.x));
                    return d.x;
                })
                .attr("cy", function (d) {
                    //d.y = Math.max(d.r, Math.min(this.height - d.r, d.y));
                    return d.y;
                })
                .attr("r", function (d) {
                    return d.r + 5;
                }).attr("stroke", function (d) {
                    return d.color;
                }).attr("stroke-width", (d) => {
                    return this.settings.nodes.nodeBorderWidth;
                });

            this.svg.selectAll('.link').data(this.links)
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                }).attr("stroke", (d) => {
                    return this.settings.links.linkColor;
                }).attr("stroke-width", (d) => {
                    return this.settings.links.linkWidth;
                });


            this.svg.selectAll('.photo').data(this.nodes)
                .attr("x", function (d) {
                    return d.x - d.r;
                })
                .attr("y", function (d) {
                    return d.y - d.r;
                }).attr('width', function (d) {
                    return d.r * 2
                })
                .attr('height', function (d) {
                    return d.r * 2
                }).attr('xlink:href', function (d) {
                    return d.photo
                }).attr('clip-path', function (d, i) {
                    return 'url(#clipPathPhoto' + i + ')'
                }).on("mouseover", this.node_mouseover)
                .on("mouseout", this.node_mouseout).call(this.d3.drag()
                    .on("start", this.dragstarted)
                    .on("drag", this.dragged)
                    .on("end", this.dragended))
                ;

            this.svg.selectAll('.clipPathPhotoCircle').data(this.nodes)
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;;
                }).attr('r', function (d) {
                    return d.r
                });
        }

        node_mouseover = (d: PeopleGraphNode) => {

            let ttso: TooltipShowOptions;
            let dataItems: VisualTooltipDataItem[] = [
                {
                    displayName: "Name",
                    value: d.name,
                }

            ];

            if (this.hasSize) {
                dataItems.push({
                    displayName: this.getDataSourceField("SourceSize") + " (Size)",
                    value: d.size.toString(),
                }
                );
            }

            if (this.hasColor) {
                dataItems.push({
                    displayName: this.getDataSourceField("SourceColor") + " (Color)",
                    value: d.color_key
                }
                );
            }

            if (this.hasExtraInfo) {
                dataItems.push({
                    displayName: this.getDataSourceField("SourceExtraInfo"),
                    value: d.extraInfo
                }
                );
            }
            let selectionId: ISelectionId[] = [];
            ttso = {
                coordinates: [d.x, d.y],
                isTouchEvent: false,
                dataItems: dataItems,
                identities: selectionId
            };

            this.host.tooltipService.show(ttso);

        }

        node_mouseout = () => {

            let ttho: TooltipHideOptions;
            ttho = {
                isTouchEvent: false,
                immediately: true
            };

            this.host.tooltipService.hide(ttho);

        }

        dragstarted = (d) => {
            if (!this.d3.event.active) this.forceSimulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        dragged = (d) => {
            d.fx = this.d3.event.x;
            d.fy = this.d3.event.y;
        }

        dragended = (d) => {
            if (!this.d3.event.active) this.forceSimulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }


        private isAllDataBound = () => {


            if (this.table.rows.length == 0) {
                return false;
            }
            else
                if (!this.hasColumnBound("SourceName") || !this.hasColumnBound("TargetName")) {
                    return false;

                }
            return true;
        }

        private hasColor = () => {
            if (this.table.rows.length == 0) {
                return false;
            }
            else {
                if (
                    this.getValue(this.table.rows[0], "SourceColor") == "" &&
                    this.getValue(this.table.rows[0], "TargetColor") == "") return false;
            }
            return true;
        }

        private hasSize = () => {
            if (this.table.rows.length == 0) {
                return false;
            }
            else {
                if (this.getValue(this.table.rows[0], "SourceSize") == "") return false;
                if (this.getValue(this.table.rows[0], "TargetSize") == "") return false;
            }
            return true;
        }
        private hasExtraInfo = () => {
            if (this.table.rows.length == 0) {
                return false;
            }
            else {
                if (
                    this.getValue(this.table.rows[0], "SourceExtraInfo") == "" &&
                    this.getValue(this.table.rows[0], "TargetExtraInfo") == "") return false;
            }
            return true;
        }

        private hasLinkWeight = () => {
            if (this.table.rows.length == 0) {
                return false;
            }
            else {
                if (this.getValue(this.table.rows[0], "LinkWeight") == "") return false;
            }
            return true;
        }


        calculateNodeSizes = () => {
            console.log('calculateNodeSizes');

            this.sizes = [];

            for (let node of this.nodes) {
                this.sizes.push(node.size);
            }

            //this.removeOutliners();
            //this.removeOutliners();

            let min: number = this.min(this.sizes);
            let max: number = this.max(this.sizes);
            console.log('min', min);
            console.log('max', max);

            let size_range_max: number[] = [];

            //calculate size ranges: divide in 7 segments
            size_range_max[0] = min;
            for (let i = 1; i < 6; i++) {
                size_range_max[i] = (max - min) / 5 + size_range_max[i - 1];
            }

            console.log('size_range_max', size_range_max);

            let count_nodes_range: number[] = [0, 0, 0, 0, 0, 0, 0];
            let size_factors: number[] = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25];

            //Set relative size factors
            for (let node of this.nodes) {
                for (let j = 0; j < size_range_max.length; j++) {
                    if (node.size < size_range_max[j]) {
                        count_nodes_range[j]++;
                        node.size_factor = size_factors[j];
                        break;
                    }
                    else if (j == size_range_max.length - 1) {
                        count_nodes_range[j + 1]++;
                        node.size_factor = size_factors[j + 1];
                    }
                }
            }

            console.log('count_nodes_range', count_nodes_range);

            let r1 =
                Math.sqrt(
                    (this.width * this.height * 0.2)
                    /
                    (
                        count_nodes_range[0] * Math.PI * Math.pow(size_factors[0], 2) +
                        count_nodes_range[1] * Math.PI * Math.pow(size_factors[1], 2) +
                        count_nodes_range[2] * Math.PI * Math.pow(size_factors[2], 2) +
                        count_nodes_range[3] * Math.PI * Math.pow(size_factors[3], 2) +
                        count_nodes_range[4] * Math.PI * Math.pow(size_factors[4], 2) +
                        count_nodes_range[5] * Math.PI * Math.pow(size_factors[5], 2) +
                        count_nodes_range[6] * Math.PI * Math.pow(size_factors[6], 2)
                    )
                );

            console.log('r1', r1);

            for (let node2 of this.nodes) {
                node2.r = r1 * node2.size_factor;
            }

            console.log('this.nodes', this.nodes);

        }

        calculateNodeColors = () => {
            console.log('calculateNodeColors');

            let colorKeys = [];
            let index: number = 0;

            for (let node of this.nodes) {
                let filter = colorKeys.filter((c) => { return c.key == node.color_key });

                if (filter.length == 0) {
                    colorKeys.push({
                        "key": node.color_key,
                        "color": this.colorPalette.getColor(node.color_key).value
                    });
                }
                index++;
            }

            if (colorKeys.length > 1) {
                for (let n of this.nodes) {
                    let colorFilter = colorKeys.filter((c) => { return c.key == n.color_key });

                    if (colorFilter.length > 0) {
                        n.color = colorFilter[0].color;
                    }
                    else {
                        n.color = "black";
                    }
                }
            }

        }

        calculateLinksStrokeWidth = () => {
            console.log('calculateLinksStrokeWidth');

            for (let link of this.links) {
                link.stroke_width = link.weight || 1;
            }
            console.log('this.links', this.links);

        }


        removeOutliners = () => {
            let mean = this.average(this.sizes);
            let stdev = this.stdev(this.sizes);
            let rangeMin = (mean - stdev) >= 0 ? mean - stdev : 0;
            let rangeMax = (mean + stdev);

            console.log('mean', mean);
            console.log('stdev', stdev);
            console.log('rangeMin', rangeMin);
            console.log('rangeMax', rangeMax);

            for (var index = 0; index < this.sizes.length; index++) {

                if (this.sizes[index] > rangeMax || this.sizes[index] < rangeMin) {
                    console.log('size =-1', this.sizes[index]);
                    this.sizes[index] = -1;
                }
            }
        }

        min = (array) => {
            let result: number = 99999999999999;

            for (let size of array) {
                if (size >= 0) {
                    if (size < result) result = size;
                }
            }
            return result;
        }
        max = (array) => {
            let result: number = 0;

            for (let size of array) {
                if (size >= 0) {
                    if (size > result) result = size;
                }
            }
            return result;
        }

        average = (numbersArray: number[]): number => {
            let result: number = 0;
            let count: number = 0;

            for (let size of numbersArray) {
                if (size >= 0) {
                    result += size;
                    count++;
                }
            }
            return result / count;
        }

        stdev = (numbersArray: number[]): number => {
            let avg: number = this.average(numbersArray);

            let result: number = 0;
            let count: number = 0;

            let sum: number = 0;

            for (let size of numbersArray) {
                if (size >= 0) {
                    sum += Math.pow(size - avg, 2);
                    count++;
                }
            }

            result = Math.sqrt(sum / count);
            return result;
        }


        public enumerateObjectInstances(
            options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {

            return SocialNetworkGraphSettings.enumerateObjectInstances(this.settings, options);
        }


    }



}