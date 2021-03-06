import React, { useEffect, useState } from 'react';
import { View, Text, PermissionsAndroid, StyleSheet, SafeAreaView, TouchableOpacity, ImageBackground, Dimensions, Image, TextInput, ScrollView, KeyboardAvoidingView, Alert, ActivityIndicator, Platform, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Modal from 'react-native-modal';
import { Images } from '../assets'
import { useDispatch, useSelector } from 'react-redux';
import { addimagedata, updateimagedata } from '../redux/Data_Reducer'
import firestore from '@react-native-firebase/firestore'
import storage from '@react-native-firebase/storage';

import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window')
const Edit = ({ navigation, route }) => {


    const [picture, setPicture] = useState({});
    const [details, setDetails] = useState();
    const [description, setDescription] = useState('');
    const [deleteModal, setDeleteModal] = useState(false);
    const [updateData, setUpdateData] = useState();
    const [edit, setEdit] = useState();

    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [transferred, setTransferred] = useState(0);
    const [imageUrl, setImageUrl] = useState(null)

    const [markdown, setMarkdown] = useState('')
    const [brand, setBrand] = useState('')
    const [size, setSize] = useState('')
    const [color, setColor] = useState('')
    const isFocused = useIsFocused();
    const dispatch = useDispatch();

    const image_data = useSelector((state) => state.DataReducer);

    let edit_data;
        if (image_data !== undefined || image_data !== null) {
            image_data.map((item, index) => {
                return edit_data = item
            })
        }
        else {
            return null
        }
    useEffect(() => {
        setMarkdown(route.params.item !== undefined || route.params.item!== null
            ? route.params.item.item.markdown
            : '')
        setBrand(route.params.item !== undefined || route.params.item != null
            ? route.params.item.item.brand
            : '')
        setColor(
            route.params.item !== undefined || route.params.item!= null
                ? route.params.item.item.color
                : '')
        setSize(route.params.item !== undefined || route.params.item!= null
            ? route.params.item.item.size
            : '')

        route.params !== undefined && setPicture(route.params.item.item)
        route.params !== undefined && setDescription(route.params.item.item.des)

        return () => {
            setPicture({})
            setDescription('')
        }
    }, [isFocused]);

    console.warn(markdown, size, brand, color, description)

    const updateImageData = (state) => {
        dispatch(updateimagedata(state))
    }


    const captureImage = async (type) => {
        let options = {
            storageOptions: {
                skipBackup: true,
                path: 'images',
            },
        };
        let isCameraPermitted = await requestCameraPermission();
        let isStoragePermitted = await requestExternalWritePermission();
        if (isCameraPermitted && isStoragePermitted) {
            launchCamera(options, (response) => {
                console.log('Response = ', response);
                if (response.didCancel) {
                    console.log('User cancelled image picker');
                } else if (response.error) {
                    console.log('ImagePicker Error: ', response.error);
                } else if (response.customButton) {
                    console.log('User tapped custom button: ', response.customButton);
                    alert(response.customButton);
                } else {
                    const source = { uri: response.uri };
                    setPicture(response)
                    uploadImage(response)
                }
            });
        };
    }

    const requestExternalWritePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        title: 'External Storage Write Permission',
                        message: 'App needs write permission',
                    },
                );
                // If WRITE_EXTERNAL_STORAGE Permission is granted
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                alert('Write permission err', err);
            }
            return false;
        } else return true;
    };
    const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'App needs camera permission',
                    },
                );
                // If CAMERA Permission is granted
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        } else return true;
    };

    const uploadImage = async (response) => {
        if (response == null) {
            return null;
        }
        const uploadUri = response.uri;
        let filename = uploadUri.substring(uploadUri.lastIndexOf('/') + 1);

        // // Add timestamp to File Name
        const extension = filename.split('.').pop();
        const name = filename.split('.').slice(0, -1).join('.');
        filename = name + Date.now() + '.' + extension;

        setUploading(true);
        setTransferred(0);

        const storageRef = storage().ref(`photos/${filename}`);
        const task = storageRef.putFile(uploadUri);

        // Set transferred state
        task.on('state_changed', (taskSnapshot) => {
            console.log(
                `${taskSnapshot.bytesTransferred} transferred out of ${taskSnapshot.totalBytes}`,
            );
            setTransferred(
                Math.round(taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) *
                100,
            );
        });
        try {
            await task;

            const url = await storageRef.getDownloadURL();

            setUploading(false);
            setImage(null);

            Alert.alert(
                'Image uploaded!',
                'Your image has been uploaded Successfully!',
            );
            setImageUrl(url)
            return url;

        } catch (e) {
            console.log(e);
            return null;
        }

    };


    const updateImagedata = async (id) => {
        const ImageUrl = await imageUrl;
        try {
            await firestore()
                .collection('Images')
                .doc(id)
                .update({
                    markdown: markdown,
                    brand: brand,
                    color: color,
                    size: size,
                    fileuri: ImageUrl != null ? ImageUrl : picture.uri,
                    description: description,
                })
                .then(async () => {
                    Alert.alert(
                        'Image Updated!',
                        'Your Image has been updated successfully.'
                    );
                    await navigation.navigate('Lists');
                })
                .catch((error) => console.log(error))
        } catch (err) {
            console.log(err)
        }
    }

    const deleteImageData = async (id) => {
        try {
            await firestore()
                .collection('Images')
                .doc(id)
                .delete()
                .then(
                    console.log(
                        'Post published!',
                        'Your post has been published Successfully!',
                    ));
            await navigation.navigate('Lists')
        }
        catch (err) {
            console.error('Error', err)
        }
    };


    const {
        mainContainerStyle,
        box1ViewStyle,
        boxViewStyle,
        buttonStyle,
        entriesViewStyle,
        entriesStyle
    } = styles;
    return (
        <>
            <SafeAreaView style={{ flex: 0, backgroundColor: '#242423' }} />
            <SafeAreaView style={{ flex: 1, backgroundColor: '#242423' }}>
                <Modal transparent={true} isVisible={deleteModal} onBackdropPres={deleteModal} >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            backgroundColor: 'transparent',
                            alignItems: 'center',
                        }}>
                        <View
                            style={{
                                height: 260,
                                width: 260,
                                borderRadius: 200,
                                paddingVertical: 10,
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                backgroundColor: '#1BB81F',
                                borderWidth: 10,
                                borderColor: '#139245',
                            }}>
                            <View style={{ width: 180, marginTop: 20 }}>
                                <Text style={{ fontSize: 22, textAlign: 'center', color: 'white', letterSpacing: 2, fontWeight: '300' }}>
                                    {'ARE YOU SURE YOU WANT TO DELETE ?'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 130 }}>
                                <TouchableOpacity onPress={() => {
                                    deleteImageData(route.params.item.item.id)
                                }}>
                                    <Text style={{ fontFamily: 'CenturyGothic', fontSize: 22, color: 'white', letterSpacing: 2 }}>YES</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setDeleteModal(!deleteModal)}>
                                    <Text style={{ fontFamily: 'CenturyGothic', fontSize: 22, color: 'white', letterSpacing: 2 }}>NO</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "position" : "height"}
                    style={{ flex: 1, }}
                >
                    <ScrollView contentContainerStyle={mainContainerStyle} >

                        <View>
                            <View style={{ borderBottomWidth: 0.7, borderBottomColor: '#595959', width: width * 0.65, alignSelf: "center", padding: 10 }} />
                            <View style={box1ViewStyle}>
                                <View >
                                    {edit_data.uri !== undefined || edit_data.uri !== null ?
                                        <>
                                            <Image
                                                source={
                                                    picture.uri != undefined
                                                        ? { uri: picture.uri }
                                                        : edit_data != undefined || edit_data.uri != null
                                                            ? { uri: edit_data.uri }
                                                            : '--'
                                                }
                                                style={{
                                                    height: height * 0.2,
                                                    width: width * 0.8, borderRadius: 15,
                                                }}
                                            />
                                            {
                                                uploading &&
                                                <View style={{ position: "absolute", top: 50, left: 100 }}>
                                                    <Text style={{ color: 'white', fontSize: 10, fontFamily: 'CenturyGothic', letterSpacing: 2, marginBottom: 5 }}>{transferred} % Completed!</Text>
                                                    <ActivityIndicator size="large" color="#1BB81F" />
                                                </View>
                                            }
                                        </>
                                        :
                                        <Text style={{ fontFamily: 'CenturyGothic', letterSpacing: 5, fontSize: 18, color: 'white' }}>
                                            PICTURE
                                        </Text>}

                                </View>
                                <TouchableOpacity onPress={() => captureImage()} style={{ position: "absolute", top: 0, right: 5, }} activeOpacity={0.7} >
                                    <Image source={Images.edit} style={{ width: 25, height: 25, }} onPress={() => console.warn('edite')} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ marginVertical: 0 }}>
                            <View style={{ width: width * 0.7, borderBottomWidth: 0.7, borderBottomColor: '#595959', alignSelf: "center" }} />
                            <View style={{ height: height * 0.049, backgroundColor: '#595959', width: 0.7, alignSelf: "center" }} />
                            <View style={{ width: width * 0.4, borderTopWidth: 0.7, borderTopColor: '#595959', alignSelf: "center" }} />
                        </View>
                        <View>
                            <View style={{ alignSelf: "center", marginVertical: 5, }}>
                                <View style={entriesViewStyle}>
                                    <Text style={entriesStyle}>{'MARKDOWN'}</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#333333', width: width * 0.28,
                                            ...Platform.select({
                                                ios: {
                                                    height: height * 0.018
                                                },
                                                android: {
                                                    height: 32
                                                }
                                            }), borderRadius: 4, fontSize: 10, color: 'white'
                                        }}
                                        value={markdown}
                                        onChangeText={(text) => setMarkdown(text)}

                                    />
                                </View>
                                <View style={entriesViewStyle}>
                                    <Text style={entriesStyle}>{'BRAND'}</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#333333', width: width * 0.36,
                                            ...Platform.select({
                                                ios: {
                                                    height: height * 0.018
                                                },
                                                android: {
                                                    height: 32
                                                }
                                            }), borderRadius: 4, fontSize: 10, color: 'white'
                                        }}
                                        value={brand}
                                        onChangeText={(text) => setBrand(text)}
                                    />
                                </View>
                                <View style={entriesViewStyle}>
                                    <Text style={entriesStyle}>{'COLOR'}</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#333333', width: width * 0.36,
                                            ...Platform.select({
                                                ios: {
                                                    height: height * 0.018
                                                },
                                                android: {
                                                    height: 32
                                                }
                                            }),
                                            borderRadius: 4, fontSize: 10, color: 'white'
                                        }}
                                        value={color}
                                        onChangeText={(text) => setColor(text)}
                                    />
                                </View>
                                <View style={entriesViewStyle}>
                                    <Text style={entriesStyle}>{'SIZE'}</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: '#333333', width: width * 0.4,
                                            ...Platform.select({
                                                ios: {
                                                    height: height * 0.018
                                                },
                                                android: {
                                                    height: 32
                                                }
                                            }),
                                            borderRadius: 4, alignItems: 'flex-start', justifyContent: 'center', fontSize: 10, color: 'white'
                                        }}
                                        value={size}
                                        onChangeText={(text) => setSize(text)}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={{ marginVertical: 0 }}>
                            <View style={{ width: width * 0.4, borderBottomWidth: 0.7, borderBottomColor: '#595959', alignSelf: "center" }} />
                            <View style={{ height: height * 0.049, backgroundColor: '#595959', width: 0.7, alignSelf: "center" }} />
                            <View style={{ width: width * 0.23, borderTopWidth: 0.7, borderTopColor: '#595959', alignSelf: "center" }} />
                        </View>
                        <View>
                            <View style={{ alignSelf: "center", }}>
                                <Text style={{ fontFamily: 'CenturyGothic', letterSpacing: 3, fontSize: 11, textAlign: 'center', color: 'white', marginVertical: 5, }}>
                                    Description
                                </Text>
                                <View >
                                    <TextInput
                                        multiline={true}
                                        maxLength={1000}
                                        editable={true}
                                        type="text"
                                        value={description !== '' ? description : edit_data !== undefined || edit_data != null ? edit_data.des : ''}
                                        onChangeText={(e) => setDescription(e)}
                                        color={'white'}
                                        style={[boxViewStyle, { color: 'white', textAlignVertical: 'top', padding: 5 }]}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={{ marginVertical: 5 }}>
                            <View style={{ width: width * 0.5, borderBottomWidth: 0.7, borderBottomColor: '#595959', alignSelf: "center" }} />
                            <View style={{ height: height * 0.049, backgroundColor: '#595959', width: 0.7, alignSelf: "center" }} />
                            <View style={{ width: width * 0.15, borderTopWidth: 0.7, borderTopColor: '#595959', alignSelf: "center" }} />
                        </View>
                        <View>
                            <View style={{ flexDirection: 'column', marginVertical: 5, alignSelf: "center" }} >
                                <TouchableOpacity
                                    onPress={async () => {
                                        updateImagedata(route.params.item.item.id)
                                    }
                                    }
                                    style={buttonStyle} >
                                    <Image
                                        source={Images.icon2}
                                        style={{ width: 60, height: 60 }} />

                                    <Text
                                        style={{ position: 'absolute', textAlign: 'center', top: 22, left: 15, fontSize: 12, fontFamily: 'CenturyGothic', color: 'white', fontWeight: '700' }}
                                    >
                                        {'SAVE'}
                                    </Text>
                                </TouchableOpacity>
                                {<TouchableOpacity
                                    style={{ alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
                                    onPress={() => setDeleteModal(!deleteModal)} >
                                    <Text style={{ color: 'white', fontFamily: 'CenturyGothic', letterSpacing: 3, fontSize: 9 }}>DELETE</Text>
                                </TouchableOpacity>}
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    )
}
export default Edit;

const styles = StyleSheet.create({
    mainContainerStyle: {
        alignItems: 'center',
    },
    box1ViewStyle: {
        marginVertical: 10,
        backgroundColor: '#333333',
        height: height * 0.19,
        width: width * 0.8,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxViewStyle: {
        backgroundColor: '#333333',
        height: height * 0.16,
        width: width * 0.6,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonStyle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    entriesViewStyle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: width * 0.5,
        marginVertical: 5,
    },
    entriesStyle: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        fontFamily: 'CenturyGothic',
        color: 'white',
        fontSize: 11,
    }
})