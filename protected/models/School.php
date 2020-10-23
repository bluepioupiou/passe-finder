<?php

/**
 * This is the model class for table "school".
 *
 * The followings are the available columns in table 'school':
 * @property integer $id
 * @property string $name
 * @property string $adress
 * @property string $postal_code
 * @property string $city
 * @property string $url
 $ @property string comment
 * @property integer $private
 * @property integer $userManager_id
 * @property string $dateCreate
 * @property string $dateMaj
 *
 * The followings are the available model relations:
 * @property Enchainement[] $enchainements
 * @property Lesson[] $lessons
 * @property User $userManager
 */
class School extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return School the static model class
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
		return 'school';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('name, adress, postal_code, city, userManager_id', 'required'),
			array('private, userManager_id', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>45),
			array('comment', 'length', 'max'=>500),
			array('adress, url', 'length', 'max'=>250),
			array('postal_code', 'length', 'max'=>5),
			array('city', 'length', 'max'=>100),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, adress, postal_code, city, url, private', 'safe', 'on'=>'search'),
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
			'enchainements' => array(self::HAS_MANY, 'Enchainement', 'school_id'),
			'lessons' => array(self::HAS_MANY, 'Lesson', 'school_id'),
			'lessonsCount'=>array(self::STAT, 'Lesson', 'school_id'),
			'userManager' => array(self::BELONGS_TO, 'User', 'userManager_id'),
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
			'adress' => 'Adresse',
			'postal_code' => 'Code Postal',
			'city' => 'Ville',
			'url' => 'adresse internet',
			'comment' => 'Commentaire',
			'private' => 'Cours privés',
			'userManager_id' => 'Responsable',
			'lessonsCount' => 'Nombre de cours'
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
		$criteria->compare('adress',$this->adress,true);
		$criteria->compare('postal_code',$this->postal_code,true);
		$criteria->compare('city',$this->city,true);
		$criteria->compare('url',$this->url,true);
		$criteria->compare('private',$this->private);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}