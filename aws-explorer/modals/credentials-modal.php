        <!-- AWS Credentials Modal -->
        <div class="modal-overlay" v-if="showCredentialsModal">
            <div class="modal-content">
                <div class="window-title">
                    <div class="window-title-text">AWS Credentials</div>
                    <div class="title-bar-controls">
                        <button @click="showCredentialsModal = false">r</button>
                    </div>
                </div>
                <div class="window-body">
                    <div style="margin-bottom: 14px;">Enter your AWS credentials to get started</div>
                    <div class="field-row-stacked" style="margin-bottom: 12px;">
                        <label for="accessKey" style="font-size: 11px; margin-bottom: 3px;">Access Key:</label>
                        <input id="accessKey" v-model="accessKey" type="password">
                    </div>
                    <div class="field-row-stacked" style="margin-bottom: 12px;">
                        <label for="secretKey" style="font-size: 11px; margin-bottom: 3px;">Secret Key:</label>
                        <input id="secretKey" v-model="secretKey" type="password">
                    </div>
                    <div class="field-row-stacked" style="margin-bottom: 12px;">
                        <label for="sessionToken" style="font-size: 11px; margin-bottom: 3px;">Session Token (optional):</label>
                        <input id="sessionToken" v-model="sessionToken" type="password">
                    </div>
                    <div class="field-row-stacked" style="margin-bottom: 16px;">
                        <label for="region" style="font-size: 11px; margin-bottom: 3px;">Region:</label>
                        <input id="region" v-model="region" value="us-east-1">
                    </div>
                    <div class="error-message" v-if="credentialsError" style="margin-bottom: 16px; font-size: 11px;">{{ credentialsError }}</div>
                    <div class="modal-footer" style="text-align:right; margin-top:20px;">
                        <button @click="verifyCredentials" :disabled="credentialsLoading" style="min-width: 75px;">
                            {{ credentialsLoading ? 'Verifying...' : 'Connect' }}
                        </button>
                        <button @click="showCredentialsModal = false" style="min-width: 75px; margin-left: 8px;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
