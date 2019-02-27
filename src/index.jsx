// Import third-party modules
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash/cloneDeep';
// Import components
import ZButton from './ZButton.jsx';
import ZText from './ZText.jsx';
import ZTextarea from './ZTextarea.jsx';
import ZCKEditor4 from './ZCKEditor4.jsx';
import ZCKEditor5 from './ZCKEditor5.jsx';
import ZFile from './ZFile.jsx';
import ZRadio from './ZRadio.jsx';
import ZCheckbox from './ZCheckbox.jsx';
import ZSelect from './ZSelect.jsx';
import ZCaptcha from './ZCaptcha.jsx';
import ZDivider from './ZDivider.jsx';
import ZWrap from './ZWrap.jsx';
import ZLoading from './ZLoading.jsx';
// Import styles
import './style.css';

const ERR_NONE = 0;
const ERR_VMANDATORY = 1;
const ERR_VFORMAT = 2;

export default class ZFormBuilder extends Component {
    state = {
        dataStorage: {},
        tab: Object.keys(this.props.tabs)[0],
        tabs: this.props.defaultTabs,
        errors: {},
        errorMessages: {},
        errorMessage: null,
        loading: false,
        allTabs: {},
        saving: false
    }

    static propTypes = {
        prefix: PropTypes.string.isRequired,
        tabs: PropTypes.objectOf(PropTypes.string),
        defaultTabs: PropTypes.arrayOf(PropTypes.string),
        data: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])).isRequired,
        commonFields: PropTypes.arrayOf(PropTypes.string),
        validation: PropTypes.objectOf(PropTypes.object),
        lang: PropTypes.objectOf(PropTypes.string),
        save: PropTypes.objectOf(PropTypes.string),
        load: PropTypes.objectOf(PropTypes.string),
        UIkit: PropTypes.func.isRequired,
        onLoadError: PropTypes.func,
        onSaveError: PropTypes.func,
        onSaveSuccess: PropTypes.func,
        axios: PropTypes.func.isRequired
    }

    static defaultProps = {
        tabs: {
            default: 'Default'
        },
        defaultTabs: ['default'],
        commonFields: [],
        validation: {},
        lang: {
            ERR_VMANDATORY: 'Field is required',
            ERR_VFORMAT: 'Invalid format',
            ERR_LOAD: 'Could not load data from server',
            ERR_SAVE: 'Could not save data',
            WILL_BE_DELETED: 'will be deleted. Are you sure?',
            YES: 'Yes',
            CANCEL: 'Cancel'
        },
        save: {
            url: null
        },
        load: {
            url: null,
            method: 'GET'
        },
        onLoadError: null,
        onSaveError: null,
        onSaveSuccess: null
    }

    constructor(props) {
        super(props);
        const values = {};
        const { data } = props;
        data.map(item => {
            if (Array.isArray(item)) {
                item.map(ai => {
                    if (ai.type.match(/^(button|divider)$/)) {
                        return;
                    }
                    switch (ai.type) {
                        case 'radio':
                            values[ai.id] = ai.values ? Object.keys(ai.values)[0] : '';
                            break;
                        case 'checkbox':
                            values[ai.id] = {};
                            break;
                        default:
                            values[ai.id] = '';
                    }
                });
            } else {
                if (item.type.match(/^(button|divider)$/)) {
                    return;
                }
                switch (item.type) {
                    case 'radio':
                        values[item.id] = item.values ? Object.keys(item.values)[0] : '';
                        break;
                    case 'checkbox':
                        values[item.id] = {};
                        break;
                    case 'select':
                        values[item.id] = item.values ? Object.keys(item.values)[0] : '';
                        break;
                    default:
                        values[item.id] = '';
                }
            }
        });
        Object.keys(props.tabs).map(key => {
            this.state.dataStorage[key] = {};
            this.state.allTabs[key] = true;
            this.state.errors[key] = {};
            this.state.errorMessages[key] = {};
        });
        this.state.dataStorage[this.state.tab] = values;
        this.types = {};
        this.fields = {};
        this.formDataExtra = {};
        this.props.data.map(item => {
            if (Array.isArray(item)) {
                item.map(ai => {
                    this.types[ai.id] = { type: ai.type, values: ai.values };
                });
            } else {
                this.types[item.id] = { type: item.type, values: item.values };
            }
        });
    }

    setFormDataExtra = data => {
        this.formDataExtra = data;
    }

    setFocusOnFields = () => {
        this.props.data.map(item => {
            if (Array.isArray(item)) {
                item.map(ai => {
                    if (ai.autofocus && !this.state.loading && this.fields[ai.id].focus) {
                        this.fields[ai.id].focus();
                    }
                });
            } else if (item.autofocus && !this.state.loading && this.fields[item.id].focus) {
                this.fields[item.id].focus();
            }
        });
    }

    componentDidMount = () => {
        this.setFocusOnFields();
        // This is required no to set focus on "+" icon
        this.props.UIkit.util.on(this.tabDivDropdown, 'hidden', () => {
            this.props.UIkit.tab(this.tabDiv).show(this.state.tabs.indexOf(this.state.tab));
        });
    }

    onGenericFieldValueChanged = (id, value) => {
        const storage = cloneDeep(this.state.dataStorage);
        storage[this.state.tab][id] = value;
        this.setState({
            dataStorage: storage
        });
    }

    onFileValueChanged = (id, value, flagDelete) => {
        const storage = cloneDeep(this.state.dataStorage);
        storage[this.state.tab][id] = storage[this.state.tab][id] || [];
        storage[this.state.tab][id] = flagDelete ? value : [...value.filter(item => !storage[this.state.tab][id].find(fitem => fitem.name.toLowerCase() === item.name.toLowerCase())), ...storage[this.state.tab][id]];
        this.setState({
            dataStorage: storage
        });
    }

    getFormItem = (item, cname) => {
        switch (item.type) {
            case 'text':
                return (<ZText
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || ''}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'captcha':
                return (<ZCaptcha
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    source={item.source}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || ''}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'textarea':
                return (<ZTextarea
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || ''}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'ckeditor5':
                return (<ZCKEditor5
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || ''}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                    CKEditor={item.CKEditorInstance}
                    editor={item.EditorInstance}
                />);
            case 'ckeditor4':
                return (<ZCKEditor4
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    scriptLoaded={false}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || ''}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'button':
                return (<ZButton
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    key={`field_${this.props.prefix}_${item.id}`}
                    buttonType={item.buttonType || 'button'}
                    css={item.css}
                    label={item.label}
                    disabled={this.state.loading}
                    onButtonClick={item.onButtonClick}
                />);
            case 'divider':
                return (<ZDivider
                    key={`field_${this.props.prefix}_${this.props.prefix}_${item.id}`}
                    css={item.css}
                />);
            case 'file':
                return (<ZFile
                    ref={input => { this.fields[item.id] = input; }}
                    key={`field_${this.props.prefix}_${item.id}`}
                    id={`field_${this.props.prefix}_${item.id}`}
                    originalId={item.id}
                    label={item.label}
                    value={this.state.dataStorage[this.state.tab][item.id]}
                    lang={this.props.lang}
                    onValueChanged={this.onFileValueChanged}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    UIkit={this.props.UIkit}
                />);
            case 'radio':
                return (<ZRadio
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || Object.keys(item.values)[0]}
                    values={item.values || {}}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'checkbox':
                return (<ZCheckbox
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || {}}
                    values={item.values || {}}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            case 'select':
                return (<ZSelect
                    ref={input => { this.fields[item.id] = input; }}
                    originalId={item.id}
                    id={`field_${this.props.prefix}_${item.id}`}
                    key={`field_${this.props.prefix}_${item.id}`}
                    css={item.css}
                    label={item.label}
                    cname={cname}
                    mandatory={this.props.validation && this.props.validation[item.id] && this.props.validation[item.id].mandatory}
                    helpText={item.helpText}
                    error={this.state.errors[this.state.tab] && this.state.errors[this.state.tab][item.id]}
                    errorMessage={this.state.errorMessages[this.state.tab] && this.state.errorMessages[this.state.tab][item.id] ? this.state.errorMessages[this.state.tab][item.id] : null}
                    value={this.state.dataStorage[this.state.tab][item.id] || Object.keys(item.values)[0]}
                    values={item.values || {}}
                    onValueChanged={this.onGenericFieldValueChanged}
                    disabled={this.state.loading}
                />);
            default:
                return null;
        }
    }

    getFormFields = () => this.props.data.map(item => {
        if (Array.isArray(item)) {
            const items = item.map(ai => this.getFormItem(ai, 'uk-width-auto uk-margin-small-right'));
            return (<ZWrap key={`field_${this.props.prefix}_wrap_${item[0].id}`} items={items} />);
        }
        return this.getFormItem(item);
    })

    getCommonFieldsData = id => {
        let data = this.state.dataStorage;
        if (this.props.commonFields && this.state.tab !== id) {
            data = cloneDeep(this.state.dataStorage);
            Object.values(this.props.commonFields).map(field => {
                data[id] = data[id] || {};
                data[id][field] = this.state.dataStorage[this.state.tab][field];
            });
        }
        return data;
    }

    onTabClick = e => {
        e.preventDefault();
        const { id } = e.currentTarget.dataset;
        const data = this.getCommonFieldsData(id);
        this.setState({
            tab: id,
            dataStorage: data
        }, () => {
            this.setFocusOnFields();
        });
    }

    onTabCloseClick = e => {
        e.stopPropagation();
        e.preventDefault();
        this.props.UIkit.tab(this.tabDiv).show(this.state.tabs.indexOf(this.state.tab));
        const { id } = e.currentTarget.dataset;
        const tabsNew = this.state.tabs.filter(item => item !== id);
        this.setState({
            tabs: tabsNew
        });
        if (tabsNew.length) {
            this.setState({
                tab: tabsNew[tabsNew.length - 1]
            });
        }
    }

    getTabs = () => this.state.tabs.map(langShort => {
        const langFull = this.props.tabs[langShort];
        return (<li key={`${this.props.prefix}_tabitem_${langShort}`} className={this.state.tab === langShort ? 'uk-active' : null}>
            <a href="#" data-id={langShort} onClick={this.onTabClick}>
                {langFull}
                &nbsp;
                <button
                    onClick={this.onTabCloseClick}
                    type="button"
                    uk-icon="icon:close;ratio:0.8"
                    data-id={langShort}
                />
            </a>
        </li>);
    })

    onTabsAddClick = () => {
        const tabs = Object.keys(this.props.tabs);
        this.props.UIkit.tab(this.tabDiv).show(tabs.indexOf(this.state.tab));
    }

    onRemainingTabClick = e => {
        const { id } = e.currentTarget.dataset;
        const tabsNew = [...this.state.tabs, id];
        const data = this.getCommonFieldsData(id);
        this.setState({
            tabs: tabsNew,
            tab: id,
            dataStorage: data
        }, () => {
            this.setFocusOnFields();
        });
    }

    getRemainingTabsData = () => {
        const defaultTabs = Object.keys(this.props.tabs);
        const tabs = defaultTabs.filter(tab => {
            if (this.state.tabs.indexOf(tab) === -1) {
                return true;
            }
            return false;
        });
        return tabs;
    }

    loadData = () => {
        this.setState({ loading: true }, () => {
            this.props.axios({
                method: this.props.load.method,
                url: this.props.load.url,
                responseType: 'json',
                data: {}
            }).then(response => {
                this.setState({ loading: false });
                if (response.data.status !== 1) {
                    this.props.UIkit.notification(response.data.errorMessage || this.props.lang.ERR_LOAD, { status: 'danger' });
                    if (this.props.onLoadError && typeof this.props.onLoadError === 'function') {
                        this.props.onLoadError(response.data.errorMessage || this.props.lang.ERR_LOAD);
                    }
                    return;
                }
                this.deserializeData(response.data.data);
            }).catch(() => {
                this.setState({ loading: false });
                this.props.UIkit.notification(this.props.lang.ERR_LOAD, { status: 'danger' });
            });
        });
    }

    getRemainingTabs = () => {
        const tabs = this.getRemainingTabsData();
        return tabs.map(tab => (<li key={`${this.props.prefix}_tabadd_${tab}`}><a href="#" data-id={tab} onClick={this.onRemainingTabClick}>{this.props.tabs[tab]}</a></li>));
    }

    serializeData = () => {
        const data = cloneDeep(this.state.dataStorage);
        const formData = new FormData();
        const fields = Object.keys(data[this.state.tabs[0]]);
        Object.keys(data).filter(tab => this.state.tabs.indexOf(tab) > -1).map(tab => {
            fields.map(field => {
                switch (this.types[field].type) {
                    case 'checkbox':
                        data[tab][field] = data[tab][field] || {};
                        data[tab][field] = Object.keys(data[tab][field]).map(key => data[tab][field][key] ? key : null).filter(item => item !== null);
                        break;
                    case 'file':
                        data[tab][field] = data[tab][field] || [];
                        break;
                    case 'radio':
                    case 'select':
                        data[tab][field] = data[tab][field] || Object.keys(this.types[field].values)[0];
                        break;
                    default:
                        data[tab][field] = data[tab][field] || '';
                }
            });
        });
        this.props.commonFields.map(item => {
            data[item] = data[this.state.tab][item];
            this.state.tabs.map(tab => {
                delete data[tab][item];
            });
        });
        Object.keys(this.props.tabs).map(tab => {
            if (this.state.tabs.indexOf(tab) === -1) {
                delete data[tab];
            }
        });
        const fileList = [];
        Object.keys(data).map(key => {
            if (this.props.tabs[key]) {
                Object.keys(data[key]).map(tkey => {
                    if (this.types[tkey].type === 'file') {
                        const arr = [];
                        data[key][tkey].map(file => {
                            if (fileList.indexOf(file.name) === -1 && file.lastModified) {
                                formData.append(file.name, file);
                                fileList.push(file.name);
                            }
                            arr.push({ name: file.name });
                        });
                        data[key][tkey] = arr;
                    }
                });
            } else if (this.types[key].type === 'file') {
                const arr = [];
                data[key].map(file => {
                    if (fileList.indexOf(file.name) === -1 && file.lastModified) {
                        formData.append(file.name, file);
                        fileList.push(file.name);
                    }
                    arr.push({ name: file.name });
                });
                data[key] = arr;
            }
        });
        formData.append('__form_data', JSON.stringify(Object.assign({}, data, this.formDataExtra)));
        return { data, formData };
    }

    deserializeData = _data => {
        const data = cloneDeep(_data);
        const dataStorageNew = {};
        const tabsNew = [];
        Object.keys(this.props.tabs).map(tab => {
            if (data[tab]) {
                dataStorageNew[tab] = {};
                const tabData = data[tab];
                Object.keys(tabData).map(field => {
                    switch (this.types[field].type) {
                        case 'checkbox':
                            dataStorageNew[tab][field] = {};
                            data[tab][field].map(key => {
                                dataStorageNew[tab][field][key] = true;
                            });
                            break;
                        case 'file':
                            dataStorageNew[tab][field] = data[tab][field].map(item => ({
                                name: item.name,
                                size: item.size
                            }));
                            break;
                        default:
                            dataStorageNew[tab][field] = data[tab][field];
                    }
                });
                if (this.props.tabs[tab]) {
                    tabsNew.push(tab);
                }
                delete data[tab];
            }
        });
        Object.keys(data).map(key => {
            tabsNew.map(tab => {
                dataStorageNew[tab] = dataStorageNew[tab] || {};
                switch (this.types[key].type) {
                    case 'checkbox':
                        dataStorageNew[tab][key] = {};
                        data[key].map(ckey => {
                            dataStorageNew[tab][key][ckey] = true;
                        });
                        break;
                    case 'file':
                        dataStorageNew[tab][key] = data[key].map(item => ({
                            name: item.name,
                            size: item.size
                        }));
                        break;
                    default:
                        dataStorageNew[tab][key] = data[key];
                }
            });
        });
        this.setState({
            tab: tabsNew[0],
            tabs: tabsNew,
            dataStorage: dataStorageNew
        });
    }

    validateItem = (id, _value) => {
        if (!this.props.validation || !this.props.validation[id]) {
            return ERR_NONE;
        }
        const validation = this.props.validation[id];
        const value = typeof _value === 'string' ? _value.trim() : _value;
        if (validation.mandatory && !value) {
            return ERR_VMANDATORY;
        }
        if (value && validation.regexp && typeof value === 'string') {
            const rex = new RegExp(validation.regexp);
            if (!rex.test(value)) {
                return ERR_VFORMAT;
            }
        }
        return ERR_NONE;
    }

    validateData = _data => {
        const data = [];
        Object.keys(_data).map(key => {
            if (typeof _data[key] === 'object' && Object.keys(_data[key]).length > 0) {
                Object.keys(_data[key]).map(skey => {
                    data.push({
                        id: skey,
                        value: _data[key][skey],
                        tab: key
                    });
                });
            } else if (!this.props.tabs[key]) {
                data.push({
                    id: key,
                    value: _data[key]
                });
            }
        });
        const vdata = data.map(item => {
            const res = this.validateItem(item.id, item.value);
            return {
                id: item.id,
                tab: item.tab || null,
                error: res
            };
        }).filter(item => item.error > ERR_NONE);
        return vdata;
    }

    showErrors = vdata => {
        const errorsNew = {};
        const errorMessagesNew = {};
        let focus;
        Object.keys(this.props.tabs).map(key => {
            errorsNew[key] = {};
            errorMessagesNew[key] = {};
        });
        vdata.map(item => {
            if (item.tab) {
                errorsNew[item.tab][item.id] = true;
                switch (item.error) {
                    case ERR_VMANDATORY:
                        errorMessagesNew[item.tab][item.id] = this.props.lang.ERR_VMANDATORY; // eslint-disable-line react/prop-types
                        break;
                    case ERR_VFORMAT:
                        errorMessagesNew[item.tab][item.id] = this.props.lang.ERR_VFORMAT; // eslint-disable-line react/prop-types
                        break;
                    default:
                        errorMessagesNew[item.tab][item.id] = '';
                }
                if (!focus) {
                    focus = true;
                    this.setState({
                        tab: item.tab
                    }, () => {
                        if (this.fields[item.id].focus) {
                            this.fields[item.id].focus();
                        }
                    });
                }
            } else {
                this.state.tabs.map(tabNew => {
                    errorsNew[tabNew][item.id] = true;
                    if (!focus) {
                        focus = true;
                        this.setState({
                            tab: tabNew
                        }, () => {
                            if (this.fields[item.id].focus) {
                                this.fields[item.id].focus();
                            }
                        });
                    }
                });
            }
        });
        this.setState({
            errors: errorsNew,
            errorMessages: errorMessagesNew
        });
    }

    refreshCaptchaFields = () => {
        Object.keys(this.fields).map(f => {
            if (this.fields[f].reloadCaptcha) {
                this.fields[f].reloadCaptcha();
            }
        });
    }

    onFormSubmit = e => {
        e.preventDefault();
        if (this.state.saving) {
            return;
        }
        this.setState({
            errors: {},
            errorMessage: null
        }, () => {
            this.setFormDataExtra({ fex_test: 'Hello world ' });
            const { data, formData } = this.serializeData();
            const vdata = this.validateData(data);
            if (vdata && vdata.length) {
                this.showErrors(vdata);
            } else {
                this.setState({ loading: true, saving: true }, () => {
                    this.props.axios.post(this.props.save.url, formData, { headers: { 'content-type': 'multipart/form-data' } }).then(response => {
                        this.setState({ loading: false, saving: false });
                        if (response.data.status !== 1) {
                            this.refreshCaptchaFields();
                            if (this.props.onSaveError && typeof this.props.onSaveError === 'function') {
                                this.props.onSaveError(response.data.errorMessage || this.props.lang.ERR_SAVE);
                            }
                            if (response.data.errors) {
                                const errorsSet = {};
                                const errorMessagesSet = {};
                                let tabSet = this.state.tab;
                                const tabsSet = cloneDeep(this.state.tabs);
                                Object.keys(response.data.errors).map(tab => {
                                    if (this.state.allTabs[tab]) {
                                        tabSet = tab;
                                        errorsSet[tab] = {};
                                        errorMessagesSet[tab] = {};
                                        if (this.state.tabs.indexOf(tab) === -1) {
                                            tabsSet.push(tab);
                                        }
                                        Object.keys(response.data.errors[tab]).map(id => {
                                            errorsSet[tab][id] = true;
                                            if (response.data.errors[tab][id]) {
                                                errorMessagesSet[tab][id] = response.data.errors[tab][id];
                                            }
                                        });
                                    }
                                });
                                this.setState({
                                    errors: errorsSet,
                                    errorMessages: errorMessagesSet,
                                    tabs: tabsSet,
                                    tab: tabSet,
                                    errorMessage: response.data.errorMessage || this.props.lang.ERR_SAVE
                                }, () => {
                                    const lastTab = Object.keys(response.data.errors)[Object.keys(response.data.errors).length - 1];
                                    const firstField = Object.keys(response.data.errors[lastTab])[0];
                                    if (this.state.allTabs[lastTab] && this.fields[firstField] && this.fields[firstField].focus) {
                                        this.fields[firstField].focus();
                                    }
                                });
                                return;
                            }
                        }
                        if (this.props.onSaveSuccess && typeof this.props.onSaveSuccess === 'function') {
                            this.props.onSaveSuccess(response);
                        }
                    }).catch(() => {
                        this.refreshCaptchaFields();
                        this.setState({ loading: false, saving: false });
                        this.props.UIkit.notification(this.props.lang.ERR_SAVE, { status: 'danger' });
                    });
                });
            }
        });
    }

    render = () => (
        <div className="zform-wrap">
            {this.props.tabs && Object.keys(this.props.tabs).length > 1 ? <ul uk-tab="" ref={item => { this.tabDiv = item; }}>{this.getTabs()}
                <li className={this.getRemainingTabsData().length || 'uk-hidden'} ref={item => { this.tabDiv = item; }}>
                    <a href="#" onClick={this.onTabsAddClick}><span uk-icon="icon:plus;ratio:0.8" /></a>
                    <div uk-dropdown="mode:click" ref={item => { this.tabDivDropdown = item; }}>
                        <ul className="uk-nav uk-dropdown-nav">
                            {this.getRemainingTabs()}
                        </ul>
                    </div>
                </li>
            </ul> : null}
            {this.state.errorMessage ? <div className="uk-alert-danger" uk-alert="true">
                <p>{this.state.errorMessage}</p>
            </div> : null}
            {this.state.tabs.length > 0 ? <form className="zform" onSubmit={this.onFormSubmit} id={this.props.prefix} uk-margin="uk-margin">{this.getFormFields()}{this.state.loading ? <ZLoading /> : null}</form> : null}
        </div>
    )
}
