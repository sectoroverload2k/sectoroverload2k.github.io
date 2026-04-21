        <!-- RDS Database Detail Modal -->
        <div class="modal-overlay" v-if="showDatabaseDetailModal">
            <div class="modal-content resource-detail-modal">
                <div class="window-title">
                    <div class="window-title-text">{{ selectedDatabase.name || 'Database Details' }}</div>
                    <div class="title-bar-controls">
                        <button @click="showDatabaseDetailModal = false">r</button>
                    </div>
                </div>
                <div class="window-body" style="padding-top: 0; margin-bottom: 0; height: calc(100% - 22px); overflow: hidden;">
                    <div style="font-size: 11px; opacity: 0.8; margin: 5px 0 10px;">{{ selectedDatabase.id }}</div>
                
                    <!-- Database detail tabs -->
                    <div class="tabs-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="tabs-header" style="display: flex; overflow-x: auto; margin-bottom: 8px;">
                            <div 
                                v-for="tab in databaseDetailTabs" 
                                :key="tab.id"
                                :class="['tab-item', { 'active': currentDatabaseTab === tab.id }]"
                                @click="currentDatabaseTab = tab.id"
                                style="padding: 3px 8px; cursor: pointer; font-size: 11px; border: 1px solid #868a8e; margin-right: 3px; min-width: 65px; text-align: center;">
                                {{ tab.name }}
                            </div>
                        </div>
                        
                        <div class="tab-content" style="padding: 8px; overflow-y: auto; flex: 1; height: 400px; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e; background: white;">
                        <!-- Details Tab -->
                        <div v-if="currentDatabaseTab === 'details'" style="line-height: 1.6;">
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Name:</strong></td>
                                    <td>{{ selectedDatabase.name }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Instance ID:</strong></td>
                                    <td>{{ selectedDatabase.id }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Status:</strong></td>
                                    <td>
                                        <span :class="'state-indicator ' + selectedDatabase.status.toLowerCase()">
                                            {{ selectedDatabase.status }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Engine:</strong></td>
                                    <td>{{ selectedDatabase.engine }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Instance Class:</strong></td>
                                    <td>{{ selectedDatabase.instanceClass }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Endpoint:</strong></td>
                                    <td>{{ selectedDatabase.endpoint || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Multi-AZ:</strong></td>
                                    <td>{{ selectedDatabase.multiAZ }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Created:</strong></td>
                                    <td>{{ selectedDatabase.data?.InstanceCreateTime ? formatDate(selectedDatabase.data.InstanceCreateTime) : '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Network Tab -->
                        <div v-if="currentDatabaseTab === 'network'" style="line-height: 1.6;">
                            <h3>VPC and Subnets</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>VPC:</strong></td>
                                    <td>
                                        <span v-if="selectedDatabase.vpcId && selectedDatabase.vpcId !== '-'" class="resource-ref">
                                            {{ selectedDatabase.vpcName }}
                                            <div class="resource-tooltip">
                                                <div class="resource-id">{{ selectedDatabase.vpcId }}</div>
                                                <div v-if="getResourceDetails(selectedDatabase.vpcId) && getResourceDetails(selectedDatabase.vpcId).details" 
                                                     class="resource-details">{{ getResourceDetails(selectedDatabase.vpcId).details }}</div>
                                            </div>
                                        </span>
                                        <span v-else>-</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Publicly Accessible:</strong></td>
                                    <td>{{ selectedDatabase.data?.PubliclyAccessible ? 'Yes' : 'No' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Availability Zone:</strong></td>
                                    <td>{{ selectedDatabase.data?.AvailabilityZone || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Subnet Group:</strong></td>
                                    <td>{{ selectedDatabase.data?.DBSubnetGroup?.DBSubnetGroupName || '-' }}</td>
                                </tr>
                            </table>
                            
                            <h3>Subnets</h3>
                            <div v-if="databaseSubnets.length === 0">No subnet information available.</div>
                            <div v-else v-for="(subnet, index) in databaseSubnets" :key="index" class="resource-card">
                                <div><strong>Name:</strong> {{ subnet.name }}</div>
                                <div><strong>ID:</strong> {{ subnet.id }}</div>
                                <div><strong>CIDR:</strong> {{ subnet.cidr }}</div>
                                <div><strong>Availability Zone:</strong> {{ subnet.az }}</div>
                                <div><strong>State:</strong> {{ subnet.state }}</div>
                                <div><strong>Public IPs Allowed:</strong> {{ subnet.public }}</div>
                            </div>
                        </div>
                        
                        <!-- Storage Tab -->
                        <div v-if="currentDatabaseTab === 'storage'" style="line-height: 1.6;">
                            <h3>Storage Configuration</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Storage Type:</strong></td>
                                    <td>{{ selectedDatabase.data?.StorageType || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Allocated Storage:</strong></td>
                                    <td>{{ selectedDatabase.storage || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>IOPS:</strong></td>
                                    <td>{{ selectedDatabase.data?.Iops || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Encrypted:</strong></td>
                                    <td>{{ selectedDatabase.encrypted }}</td>
                                </tr>
                                <tr v-if="selectedDatabase.data?.StorageEncrypted">
                                    <td><strong>KMS Key ID:</strong></td>
                                    <td>{{ selectedDatabase.data?.KmsKeyId || '-' }}</td>
                                </tr>
                            </table>
                            
                            <h3>Backup Configuration</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Backup Retention Period:</strong></td>
                                    <td>{{ selectedDatabase.data?.BackupRetentionPeriod || '0' }} days</td>
                                </tr>
                                <tr>
                                    <td><strong>Backup Window:</strong></td>
                                    <td>{{ selectedDatabase.data?.PreferredBackupWindow || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Latest Backup:</strong></td>
                                    <td>{{ selectedDatabase.data?.LatestRestorableTime ? formatDate(selectedDatabase.data.LatestRestorableTime) : '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Maintenance Window:</strong></td>
                                    <td>{{ selectedDatabase.data?.PreferredMaintenanceWindow || '-' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Security Tab -->
                        <div v-if="currentDatabaseTab === 'security'" style="line-height: 1.6;">
                            <h3>Security Groups</h3>
                            <div v-if="databaseSecurityGroups.length === 0">No security groups attached.</div>
                            <div v-else v-for="(sg, index) in databaseSecurityGroups" :key="index" class="resource-card">
                                <div><strong>Name:</strong> {{ sg.name }}</div>
                                <div><strong>ID:</strong> {{ sg.id }}</div>
                                <div><strong>Description:</strong> {{ sg.description }}</div>
                                <div><strong>VPC:</strong> {{ sg.vpcId }}</div>
                                <div><strong>Ingress Rules:</strong> {{ sg.ingressRulesCount }}</div>
                                <div><strong>Egress Rules:</strong> {{ sg.egressRulesCount }}</div>
                            </div>
                            
                            <h3>Encryption</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Storage Encrypted:</strong></td>
                                    <td>{{ selectedDatabase.encrypted }}</td>
                                </tr>
                                <tr>
                                    <td><strong>IAM Authentication:</strong></td>
                                    <td>{{ selectedDatabase.data?.IAMDatabaseAuthenticationEnabled ? 'Enabled' : 'Disabled' }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Terraform Tab -->
                        <div v-if="currentDatabaseTab === 'terraform'" style="line-height: 1.6;">
                            <h3>Terraform Resource</h3>
                            <textarea 
                                v-model="databaseTerraformCode" 
                                style="width: 100%; height: 350px; font-family: monospace; padding: 10px; border-radius: 4px; border: 1px solid #ccc; resize: none;" 
                                readonly></textarea>
                            <div style="margin-top: 10px; text-align: right;">
                                <button @click="copyToClipboard(databaseTerraformCode)" style="margin-right: 10px;">
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
