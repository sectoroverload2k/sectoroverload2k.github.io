        <!-- ElastiCache ValKey Detail Modal -->
        <div class="modal-overlay" v-if="showValKeyDetailModal">
            <div class="modal-content resource-detail-modal">
                <div class="window-title">
                    <div class="window-title-text">{{ selectedValKey.name || 'ValKey Details' }}</div>
                    <div class="title-bar-controls">
                        <button @click="showValKeyDetailModal = false">r</button>
                    </div>
                </div>
                <div class="window-body" style="padding-top: 0; margin-bottom: 0; height: calc(100% - 22px); overflow: hidden;">
                    <div style="font-size: 11px; opacity: 0.8; margin: 5px 0 10px;">{{ selectedValKey.id }}</div>
                
                    <!-- ValKey detail tabs -->
                    <div class="tabs-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="tabs-header" style="display: flex; overflow-x: auto; margin-bottom: 8px;">
                            <div 
                                v-for="tab in valKeyDetailTabs" 
                                :key="tab.id"
                                :class="['tab-item', { 'active': currentValKeyTab === tab.id }]"
                                @click="currentValKeyTab = tab.id"
                                style="padding: 3px 8px; cursor: pointer; font-size: 11px; border: 1px solid #868a8e; margin-right: 3px; min-width: 65px; text-align: center;">
                                {{ tab.name }}
                            </div>
                        </div>
                        
                        <div class="tab-content" style="padding: 8px; overflow-y: auto; flex: 1; height: 400px; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e; background: white;">
                        <!-- Details Tab -->
                        <div v-if="currentValKeyTab === 'details'" style="line-height: 1.6;">
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Name:</strong></td>
                                    <td>{{ selectedValKey.name }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Cluster ID:</strong></td>
                                    <td>{{ selectedValKey.id }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Status:</strong></td>
                                    <td>
                                        <span :class="'state-indicator ' + selectedValKey.status.toLowerCase()">
                                            {{ selectedValKey.status }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Node Type:</strong></td>
                                    <td>{{ selectedValKey.nodeType }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Engine:</strong></td>
                                    <td>{{ selectedValKey.engine }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Engine Version:</strong></td>
                                    <td>{{ selectedValKey.engineVersion }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Node Count:</strong></td>
                                    <td>{{ selectedValKey.nodeCount || selectedValKey.data?.NumCacheNodes || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Created:</strong></td>
                                    <td>{{ selectedValKey.data?.CacheClusterCreateTime ? formatDate(selectedValKey.data.CacheClusterCreateTime) : '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Network Tab -->
                        <div v-if="currentValKeyTab === 'network'" style="line-height: 1.6;">
                            <h3>VPC and Subnets</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>VPC:</strong></td>
                                    <td>
                                        <span v-if="selectedValKey.vpcId && selectedValKey.vpcId !== '-'" class="resource-ref">
                                            {{ selectedValKey.vpcName }}
                                            <div class="resource-tooltip">
                                                <div class="resource-id">{{ selectedValKey.vpcId }}</div>
                                                <div v-if="getResourceDetails(selectedValKey.vpcId) && getResourceDetails(selectedValKey.vpcId).details" 
                                                     class="resource-details">{{ getResourceDetails(selectedValKey.vpcId).details }}</div>
                                            </div>
                                        </span>
                                        <span v-else>-</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Subnet Group:</strong></td>
                                    <td>{{ selectedValKey.data?.CacheSubnetGroupName || '-' }}</td>
                                </tr>
                            </table>
                            
                            <h3>Network Configuration</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Network Type:</strong></td>
                                    <td>{{ selectedValKey.data?.NetworkType || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Endpoint:</strong></td>
                                    <td>{{ selectedValKey.endpoint || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Port:</strong></td>
                                    <td>{{ selectedValKey.port || '-' }}</td>
                                </tr>
                            </table>
                            
                            <h3>Nodes</h3>
                            <div v-if="valKeyNodes.length === 0">No node information available.</div>
                            <div v-else v-for="(node, index) in valKeyNodes" :key="index" class="resource-card">
                                <div><strong>ID:</strong> {{ node.id }}</div>
                                <div><strong>Status:</strong> {{ node.status }}</div>
                                <div><strong>Availability Zone:</strong> {{ node.az }}</div>
                                <div><strong>Endpoint:</strong> {{ node.endpoint }}</div>
                                <div><strong>Created:</strong> {{ node.createdAt ? formatDate(node.createdAt) : '-' }}</div>
                            </div>
                        </div>
                        
                        <!-- Configuration Tab -->
                        <div v-if="currentValKeyTab === 'configuration'" style="line-height: 1.6;">
                            <h3>Cache Configuration</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Parameter Group:</strong></td>
                                    <td>{{ selectedValKey.data?.CacheParameterGroup?.CacheParameterGroupName || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Auto Minor Version Upgrade:</strong></td>
                                    <td>{{ selectedValKey.data?.AutoMinorVersionUpgrade ? 'Enabled' : 'Disabled' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Maintenance Window:</strong></td>
                                    <td>{{ selectedValKey.data?.PreferredMaintenanceWindow || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Snapshot Retention Limit:</strong></td>
                                    <td>{{ selectedValKey.data?.SnapshotRetentionLimit || '0' }} days</td>
                                </tr>
                                <tr>
                                    <td><strong>Snapshot Window:</strong></td>
                                    <td>{{ selectedValKey.data?.SnapshotWindow || '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Security Tab -->
                        <div v-if="currentValKeyTab === 'security'" style="line-height: 1.6;">
                            <h3>Security Groups</h3>
                            <div v-if="valKeySecurityGroups.length === 0">No security groups attached.</div>
                            <div v-else v-for="(sg, index) in valKeySecurityGroups" :key="index" class="resource-card">
                                <div><strong>Name:</strong> {{ sg.name }}</div>
                                <div><strong>ID:</strong> {{ sg.id }}</div>
                                <div><strong>Description:</strong> {{ sg.description }}</div>
                                <div><strong>VPC:</strong> {{ sg.vpcId }}</div>
                            </div>
                            
                            <h3>Encryption</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Transit Encryption:</strong></td>
                                    <td>{{ selectedValKey.data?.TransitEncryptionEnabled ? 'Enabled' : 'Disabled' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>At-Rest Encryption:</strong></td>
                                    <td>{{ selectedValKey.data?.AtRestEncryptionEnabled ? 'Enabled' : 'Disabled' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Authentication:</strong></td>
                                    <td>{{ selectedValKey.data?.AuthTokenEnabled ? 'Enabled' : 'Disabled' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Tags Tab -->
                        <div v-if="currentValKeyTab === 'tags'" style="line-height: 1.6;">
                            <h3>Resource Tags</h3>
                            <div v-if="!selectedValKey.data?.Tags || selectedValKey.data.Tags.length === 0">
                                No tags found.
                            </div>
                            <div v-else>
                                <table class="detail-table" style="width: 100%;">
                                    <thead>
                                        <tr>
                                            <th>Key</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(tag, index) in selectedValKey.data.Tags" :key="index">
                                            <td>{{ tag.Key }}</td>
                                            <td>{{ tag.Value }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Terraform Tab -->
                        <div v-if="currentValKeyTab === 'terraform'" style="line-height: 1.6;">
                            <h3>Terraform Resource</h3>
                            <textarea 
                                v-model="valKeyTerraformCode" 
                                style="width: 100%; height: 350px; font-family: monospace; padding: 10px; border-radius: 4px; border: 1px solid #ccc; resize: none;" 
                                readonly></textarea>
                            <div style="margin-top: 10px; text-align: right;">
                                <button @click="copyToClipboard(valKeyTerraformCode)" style="margin-right: 10px;">
                                    Copy to Clipboard
                                </button>
                                <button @click="downloadTerraformCode">Download .tf File</button>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>