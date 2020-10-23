<?php
$this->breadcrumbs=array(
	'Enchainements',
);

$this->menu=array(
	array('label'=>'Create Enchainement', 'url'=>array('create')),
	array('label'=>'Manage Enchainement', 'url'=>array('admin')),
);
?>
<?php
Yii::app()->clientScript->registerScript('search',
    "var ajaxUpdateTimeout;
    var ajaxRequest;
    $('input#search').keyup(function(){
        ajaxRequest = $(this).serialize();
        clearTimeout(ajaxUpdateTimeout);
        ajaxUpdateTimeout = setTimeout(function () {
            $.fn.yiiListView.update(
                'yw0',
                {data: ajaxRequest}
            )
        },
        500);
    });"
);
?>
<h2>Enchainements</h2>
<span class="alert i_info">Seuls les enchainements publiés et publics ou d'une école dont vous êtes élève sont affichés ici. Ainsi que ceux créées par vos soins</span><br />
Recherche : <input type="text" id="search" name="search" />
<div id="videoFiltering">Vidéos :
<?php 
    echo CHtml::dropDownList('dropit', '', 
     array('both'=>'avec ou sans','with'=>'avec vidéo','without'=>'sans vidéo'),
     array('onchange'=>"$.fn.yiiListView.update('yw0', {url: '".Yii::app()->createUrl('enchainement/index')."?withOrWithoutVideo='+$('#dropit option:selected').val()})"));
?>
</div>
<?php 
	$dataProvider->sort->defaultOrder='dateCreate DESC';
	$this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'itemView'=>'_view',
	'template'=>"{sorter}{summary}{pager}\n{items}\n{pager}",	
	'sortableAttributes'=>array(
		'name'=>'Nom',
		'dateCreate'=>'creation'
	),
)); ?>


