        <!-- Terraform Export Modal -->
        <div class="modal-overlay" v-if="showExportModal">
            <div class="modal-content" style="width: 600px; max-width: 90%;">
                <div class="window-title">
                    <div class="window-title-text">Export to Terraform</div>
                    <div class="title-bar-controls">
                        <button @click="showExportModal = false">r</button>
                    </div>
                </div>
                <div class="window-body">
                    <div style="margin-bottom: 10px; font-size: 11px;">Configure export options and select resources to export</div>
                    
                    <!-- Export Options -->
                    <fieldset style="margin-bottom: 16px; padding: 10px; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e;">
                        <legend style="font-size: 11px; font-weight: bold; padding: 0 3px;">Export Options</legend>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <label style="display: flex; align-items: center; min-width: 45%; font-size: 11px;">
                                <input type="checkbox" v-model="exportOptions.includeProviders">
                                <span style="margin-left: 5px;">Include Provider Configuration</span>
                            </label>
                            <label style="display: flex; align-items: center; min-width: 45%; font-size: 11px;">
                                <input type="checkbox" v-model="exportOptions.includeState">
                                <span style="margin-left: 5px;">Include State Import Commands</span>
                            </label>
                            <label style="display: flex; align-items: center; min-width: 45%; font-size: 11px;">
                                <input type="checkbox" v-model="exportOptions.useModules">
                                <span style="margin-left: 5px;">Use Terraform Modules</span>
                            </label>
                            <label style="display: flex; align-items: center; min-width: 45%; font-size: 11px;">
                                <input type="checkbox" v-model="exportOptions.includeComments">
                                <span style="margin-left: 5px;">Include Comments</span>
                            </label>
                        </div>
                    </fieldset>
                    
                    <!-- Resource Selection -->
                    <fieldset style="margin-bottom: 16px; padding: 10px; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e;">
                        <legend style="font-size: 11px; font-weight: bold; padding: 0 3px;">Select Resources to Export</legend>
                        <div style="margin-bottom: 10px;">
                            <button @click="selectAllResources(true)" style="margin-right: 8px; font-size: 11px;">Select All</button>
                            <button @click="selectAllResources(false)" style="font-size: 11px;">Deselect All</button>
                        </div>
                        <div style="max-height: 200px; overflow-y: auto; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e; padding: 4px; background-color: white;">
                            <div v-for="(resource, index) in exportSelectedResources" :key="index" style="margin-bottom: 4px; padding: 3px; border-bottom: 1px solid #ddd; font-size: 11px;">
                                <label style="display: flex; align-items: center;">
                                    <input type="checkbox" v-model="resource.selected">
                                    <span style="margin-left: 5px;">
                                        <span style="font-weight: bold;">{{ resource.name }}</span>
                                        <span style="opacity: 0.7;"> ({{ resource.id }})</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </fieldset>
                    
                    <div class="modal-footer" style="text-align:right; margin-top:20px;">
                        <button @click="generateTerraformCode()" style="min-width: 75px;">Export</button>
                        <button @click="showExportModal = false" style="min-width: 75px; margin-left: 8px;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
