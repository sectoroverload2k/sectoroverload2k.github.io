        <!-- EC2 Instance Detail Modal -->
        <div class="modal-overlay" v-if="showInstanceDetailModal">
            <div class="modal-content resource-detail-modal">
                <div class="window-title">
                    <div class="window-title-text">{{ selectedInstance.name || 'Instance Details' }}</div>
                    <div class="title-bar-controls">
                        <button @click="showInstanceDetailModal = false">r</button>
                    </div>
                </div>
                <div class="window-body" style="padding-top: 0; margin-bottom: 0; height: calc(100% - 22px); overflow: hidden;">
                    <div style="font-size: 11px; opacity: 0.8; margin: 5px 0 10px;">{{ selectedInstance.id }}</div>
                
                <!-- Instance detail tabs -->
                <div class="tabs-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="tabs-header" style="display: flex; overflow-x: auto; margin-bottom: 8px;">
                        <div 
                            v-for="tab in instanceDetailTabs" 
                            :key="tab.id"
                            :class="['tab-item', { 'active': currentInstanceTab === tab.id }]"
                            @click="currentInstanceTab = tab.id"
                            style="padding: 3px 8px; cursor: pointer; font-size: 11px; border: 1px solid #868a8e; margin-right: 3px; min-width: 65px; text-align: center;">
                            {{ tab.name }}
                        </div>
                    </div>
                    <div class="tab-content" style="padding: 8px; overflow-y: auto; flex: 1; height: 400px; border: 2px solid; border-color: #868a8e #dfdfdf #dfdfdf #868a8e; background: white;">
                        <!-- Details Tab -->
                        <div v-if="currentInstanceTab === 'details'" style="line-height: 1.6;">
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Name:</strong></td>
                                    <td>{{ selectedInstance.name }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Instance ID:</strong></td>
                                    <td>{{ selectedInstance.id }}</td>
                                </tr>
                                <tr>
                                    <td><strong>State:</strong></td>
                                    <td>
                                        <span :class="'state-indicator ' + selectedInstance.state">
                                            {{ selectedInstance.state }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Instance Type:</strong></td>
                                    <td>{{ selectedInstance.type }}</td>
                                </tr>
                                <tr>
                                    <td><strong>AMI ID:</strong></td>
                                    <td>{{ selectedInstance.data?.ImageId || '-' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Platform:</strong></td>
                                    <td>{{ selectedInstance.platform || 'Linux/Unix' }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Launch Time:</strong></td>
                                    <td>{{ formatDate(selectedInstance.launchTime) }}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Networking Tab -->
                        <div v-if="currentInstanceTab === 'networking'" style="line-height: 1.6;">
                            <h3>Network Interfaces</h3>
                            <div v-if="instanceNetworkInterfaces.length === 0">No network interfaces found.</div>
                            <div v-else v-for="(ni, index) in instanceNetworkInterfaces" :key="index" class="resource-card">
                                <div><strong>ID:</strong> {{ ni.id }}</div>
                                <div><strong>Private IP:</strong> {{ ni.privateIp }}</div>
                                <div><strong>Public IP:</strong> {{ ni.publicIp }}</div>
                                <div><strong>Status:</strong> {{ ni.status }}</div>
                                <div v-if="ni.subnetId">
                                    <strong>Subnet:</strong> 
                                    <resource-ref :resource-id="ni.subnetId"></resource-ref>
                                </div>
                                <div v-if="ni.vpcId">
                                    <strong>VPC:</strong> 
                                    <resource-ref :resource-id="ni.vpcId"></resource-ref>
                                </div>
                            </div>
                            
                            <h3>Elastic IPs</h3>
                            <div v-if="instanceElasticIPs.length === 0">No elastic IPs found.</div>
                            <div v-else v-for="(eip, index) in instanceElasticIPs" :key="index" class="resource-card">
                                <div><strong>Allocation ID:</strong> {{ eip.id }}</div>
                                <div><strong>Public IP:</strong> {{ eip.publicIp }}</div>
                                <div><strong>Private IP:</strong> {{ eip.privateIp }}</div>
                                <div><strong>Domain:</strong> {{ eip.domain }}</div>
                            </div>
                            
                            <h3>Placement</h3>
                            <table class="detail-table">
                                <tr>
                                    <td><strong>Availability Zone:</strong></td>
                                    <td>{{ selectedInstance.az }}</td>
                                </tr>
                                <tr>
                                    <td><strong>Subnet:</strong></td>
                                    <td>
                                        <resource-ref v-if="selectedInstance.data?.SubnetId" 
                                                     :resource-id="selectedInstance.data.SubnetId">
                                        </resource-ref>
                                        <span v-else>-</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>VPC:</strong></td>
                                    <td>
                                        <resource-ref v-if="selectedInstance.data?.VpcId" 
                                                     :resource-id="selectedInstance.data.VpcId">
                                        </resource-ref>
                                        <span v-else>-</span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Storage Tab -->
                        <div v-if="currentInstanceTab === 'storage'" style="line-height: 1.6;">
                            <h3>EBS Volumes</h3>
                            <div v-if="instanceVolumes.length === 0">No volumes found.</div>
                            <div v-else v-for="(volume, index) in instanceVolumes" :key="index" class="resource-card">
                                <div><strong>ID:</strong> {{ volume.id }}</div>
                                <div><strong>Name:</strong> {{ volume.name }}</div>
                                <div><strong>Size:</strong> {{ volume.size }}</div>
                                <div><strong>Type:</strong> {{ volume.type }}</div>
                                <div><strong>State:</strong> {{ volume.state }}</div>
                                <div><strong>Device:</strong> {{ volume.data?.Attachments[0]?.Device || '-' }}</div>
                                <div><strong>Encrypted:</strong> {{ volume.data?.Encrypted ? 'Yes' : 'No' }}</div>
                            </div>
                        </div>
                        
                        <!-- Security Tab -->
                        <div v-if="currentInstanceTab === 'security'" style="line-height: 1.6;">
                            <h3>Security Groups</h3>
                            <div v-if="!selectedInstance.data?.SecurityGroups || selectedInstance.data.SecurityGroups.length === 0">
                                No security groups found.
                            </div>
                            <div v-else v-for="(sg, index) in selectedInstance.data.SecurityGroups" :key="index" class="resource-card">
                                <div><strong>ID:</strong> {{ sg.GroupId }}</div>
                                <div><strong>Name:</strong> {{ sg.GroupName }}</div>
                                <div v-if="getSecurityGroupDetails(sg.GroupId)">
                                    <strong>Description:</strong> {{ getSecurityGroupDetails(sg.GroupId).description || '-' }}
                                </div>
                            </div>
                            
                            <h3>Key Pair</h3>
                            <div v-if="!selectedInstance.keyName || selectedInstance.keyName === '-'">
                                No key pair found.
                            </div>
                            <div v-else class="resource-card">
                                <div><strong>Name:</strong> {{ selectedInstance.keyName }}</div>
                            </div>
                            
                            <h3>IAM Role</h3>
                            <div v-if="!selectedInstance.data?.IamInstanceProfile">
                                No IAM role attached.
                            </div>
                            <div v-else class="resource-card">
                                <div><strong>ARN:</strong> {{ selectedInstance.data.IamInstanceProfile.Arn }}</div>
                                <div><strong>ID:</strong> {{ selectedInstance.data.IamInstanceProfile.Id }}</div>
                            </div>
                        </div>
                        
                        <!-- Tags Tab -->
                        <div v-if="currentInstanceTab === 'tags'" style="line-height: 1.6;">
                            <h3>Instance Tags</h3>
                            <div v-if="!selectedInstance.data?.Tags || selectedInstance.data.Tags.length === 0">
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
                                        <tr v-for="(tag, index) in selectedInstance.data.Tags" :key="index">
                                            <td>{{ tag.Key }}</td>
                                            <td>{{ tag.Value }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Terraform Tab -->
                        <div v-if="currentInstanceTab === 'terraform'" style="line-height: 1.6;">
                            <h3>Terraform Resource</h3>
                            <textarea 
                                v-model="instanceTerraformCode" 
                                style="width: 100%; height: 350px; font-family: monospace; padding: 10px; border-radius: 4px; border: 1px solid #ccc; resize: none;" 
                                readonly></textarea>
                            <div style="margin-top: 10px; text-align: right;">
                                <button @click="copyToClipboard(instanceTerraformCode)" style="margin-right: 10px;">
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
