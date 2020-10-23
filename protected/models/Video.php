<?php

/**
 * This is the model class for table "video".
 *
 * The followings are the available columns in table 'video':
 * @property integer $id
 * @property string $name
 * @property string $description
 * @property integer $enchainement_id
 * @property string $dateCreate
 * @property string $dateMaj
 * @property string $youtube_url
 *
 * The followings are the available model relations:
 * @property Enchainement $enchainement
 */
class Video extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Video the static model class
	 */
	public static function model($className=__CLASS__)
	{
		return parent::model($className);
	}

	/**
	 * @return string the associated database table name
	 */
	public function tableName()
	{
		return 'video';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('dateCreate, dateMaj, youtube_url, enchainement_id', 'required'),
			array('enchainement_id', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>45),
			array('description, youtube_url', 'length', 'max'=>250),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, description, enchainement_id, dateCreate, dateMaj, youtube_url', 'safe', 'on'=>'search'),
		);
	}

	/**
	 * @return array relational rules.
	 */
	public function relations()
	{
		// NOTE: you may need to adjust the relation name and the related
		// class name for the relations automatically generated below.
		return array(
			'enchainement' => array(self::BELONGS_TO, 'Enchainement', 'enchainement_id'),
		);
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'id' => 'Identifiant',
			'name' => 'Nom',
			'description' => 'Description',
			'enchainement_id' => 'Enchainement',
			'dateCreate' => 'Date de création',
			'dateMaj' => 'Date de mise à jour',
			'youtube_url' => 'Numéro d\'identification Youtube',
		);
	}

	/**
	 * Retrieves a list of models based on the current search/filter conditions.
	 * @return CActiveDataProvider the data provider that can return the models based on the search/filter conditions.
	 */
	public function search()
	{
		// Warning: Please modify the following code to remove attributes that
		// should not be searched.

		$criteria=new CDbCriteria;

		$criteria->compare('id',$this->id);
		$criteria->compare('name',$this->name,true);
		$criteria->compare('description',$this->description,true);
		$criteria->compare('enchainement_id',$this->enchainement_id);
		$criteria->compare('dateCreate',$this->dateCreate,true);
		$criteria->compare('dateMaj',$this->dateMaj,true);
		$criteria->compare('youtube_url',$this->youtube_url,true);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}